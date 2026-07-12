"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState, Suspense } from "react";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import dynamic from "next/dynamic";
import KurtiPicCard from "@/src/app/(protected)/_components/kurti/kurtiPicCard";
import NotValidKurtiCode from "@/src/app/(protected)/_components/errorPages/NotValidKurtiCode";
import PageLoader from "@/src/components/loader";
import NotAllowedPage from "@/src/app/(protected)/_components/errorPages/NotAllowedPage";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/src/components/ui/pagination";
import { RoleGateForComponent } from "@/src/components/auth/role-gate-component";
import { UserRole } from "@prisma/client";
import { SearchBar } from "@/src/components/Searchbar";
import { Button } from "@/src/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import { Skeleton } from "@/src/components/ui/skeleton";

function KurtiCardSkeleton() {
  return (
    <div className="w-[300px] bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden flex flex-col justify-between h-[637px]">
      <Skeleton className="h-72 w-full bg-gray-200 animate-pulse rounded-t-2xl" />
      <div className="p-4 space-y-4 flex-1 flex flex-col justify-between bg-white">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-24 bg-gray-200 rounded" />
            <Skeleton className="h-4 w-12 bg-gray-200 rounded" />
          </div>
          <Skeleton className="h-7 w-20 bg-gray-200 rounded" />
          <div className="space-y-1.5 pt-2">
            <Skeleton className="h-3.5 w-16 bg-gray-150 rounded mb-1" />
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-5 w-12 bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
          <Skeleton className="h-9 flex-1 bg-gray-200 rounded" />
          <Skeleton className="h-9 w-9 bg-gray-200 rounded" />
          <Skeleton className="h-9 w-9 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}

interface kurti {
  id: string;
  category: string;
  code: string;
  images: any[];
  sizes: { size: string; quantity: number }[];
  reservedSizes?: { size: string; quantity: number }[];
  party: string;
  sellingPrice: string;
  actualPrice: string;
  countOfPiece?: number;
}

function KurtiListPage() {
  const path = usePathname().split("/");
  const pathname = usePathname();
  const router = useRouter();
  const code = path[2];
  const pageNum = path[4];
  const baseUrl = pathname.substring(0, pathname.indexOf("page/") + 5);

  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("search") || "";
  const urlSizes = searchParams.get("sizes") ? searchParams.get("sizes")!.split(",") : [];

  const [valid, setValid] = useState(true);
  const [kurtiData, setKurtiData] = useState<kurti[]>([]);
  const [displayData, setDisplayData] = useState<any[]>([]);
  const [textFieldValue, setTextFieldValue] = useState(urlSearch);
  const [currentPage, setCurrentPage] = useState(parseInt(pageNum));
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pageLoader, setPageLoader] = useState(true);
  const [selectedSizes, setSelectedSizes] = useState<string[]>(urlSizes);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [jumpPage, setJumpPage] = useState("");
  const [deletePassword, setDeletePassword] = useState("");

  const SIZE_ORDER = [
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "XXL",
    "3XL",
    "4XL",
    "5XL",
    "6XL",
    "7XL",
    "8XL",
    "9XL",
    "10XL",
  ];

  const getAvailableSizes = (data: kurti[]) => {
    const set = new Set<string>();
    for (const k of data) {
      for (const s of k.sizes || []) {
        if (!s?.size) continue;
        if ((s.quantity ?? 0) > 0) set.add(String(s.size).toUpperCase());
      }
    }
    return Array.from(set).sort((a, b) => {
      const ai = SIZE_ORDER.indexOf(a);
      const bi = SIZE_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  };

  const applyFilters = (data: kurti[]) => {
    const search = textFieldValue.trim();
    return data.filter((row) => {
      const matchesSearch =
        search.length === 0 || row.code.toUpperCase().includes(search.toUpperCase());

      const matchesSize =
        selectedSizes.length === 0 ||
        (row.sizes || []).some(
          (s) =>
            selectedSizes.includes(String(s.size).toUpperCase()) &&
            (s.quantity ?? 0) > 0
        );

      return matchesSearch && matchesSize;
    });
  };

  const updatePaginationView = (allRows: kurti[], page: number) => {
    const filtered = applyFilters(allRows);
    
    // Group filtered kurtis by parentCode || code
    const groupedMap = new Map<string, kurti[]>();
    filtered.forEach((item) => {
      const key = (item as any).parentCode || item.code;
      if (!groupedMap.has(key)) {
        groupedMap.set(key, []);
      }
      groupedMap.get(key)!.push(item);
    });

    const groupedList: kurti[][] = [];
    groupedMap.forEach((variants, parentCode) => {
      const sorted = [...variants].sort((a, b) => {
        if (a.code === parentCode) return -1;
        if (b.code === parentCode) return 1;
        return a.code.localeCompare(b.code);
      });
      groupedList.push(sorted);
    });

    const pages = Math.max(1, Math.ceil(groupedList.length / 20));
    const safePage = Math.min(Math.max(page, 1), pages);
    setTotalPages(pages);
    setDisplayData(groupedList.slice(20 * (safePage - 1), 20 * (safePage - 1) + 20));
  };

  const buildUrl = (page: number, search: string, sizes: string[]) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (sizes.length > 0) params.set("sizes", sizes.join(","));
    const queryString = params.toString();
    return `${baseUrl}${page}${queryString ? `?${queryString}` : ""}`;
  };

  const handleSearch = (newVal: string) => {
    router.replace(buildUrl(1, newVal, selectedSizes));
  };

  const cancelSearch = () => {
    router.replace(buildUrl(1, "", selectedSizes));
  };

  const handleKurtiDelete = async (data: kurti[]) => {
    await setKurtiData([...data]);
    setLoading(true);
  };

  const toggleSelectKurti = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return Array.from(next);
    });
  };

  const handleSelectAll = () => {
    const visibleIds: string[] = [];
    displayData.forEach((variants) => {
      const primary = variants[0];
      if (primary) visibleIds.push(primary.id);
    });

    const allSelected = visibleIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleDeleteSelected = async () => {
    const selectedItems = kurtiData.filter((k) => selectedIds.includes(k.id));
    if (selectedItems.length === 0) return;

    if (!deletePassword.trim()) {
      toast.error("Please enter the delete password");
      return;
    }

    const expectedPassword = process.env.NEXT_PUBLIC_DELETE_PASSWORD;
    if (deletePassword !== expectedPassword) {
      toast.error("Invalid password");
      return;
    }

    setDeleteConfirmOpen(false);
    setDeletePassword("");
    setPageLoader(true);
    try {
      await Promise.all(
        selectedItems.map((item) =>
          fetch(`/api/kurti/delete?cat=${item.category.toLowerCase()}&code=${item.code.toLowerCase()}`).then((res) =>
            res.json()
          )
        )
      );
      toast.success(`Successfully deleted ${selectedItems.length} products`);
      setSelectedIds([]);
      setLoading(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete selected products");
    } finally {
      setPageLoader(false);
    }
  };

  const handleJumpToPage = () => {
    const pageVal = parseInt(jumpPage);
    if (!Number.isNaN(pageVal) && pageVal >= 1 && pageVal <= totalPages) {
      handlePageChange(pageVal);
    } else {
      toast.error(`Please enter a valid page number between 1 and ${totalPages}`);
    }
  };

  const handlePageChange = (page: number) => {
    if (page <= totalPages && page >= 1) {
      router.replace(buildUrl(page, textFieldValue, selectedSizes));
    }
  };

  // Sync state when URL dynamic pageNum or search parameters change
  useEffect(() => {
    const p = parseInt(pageNum);
    if (!Number.isNaN(p)) {
      setCurrentPage(p);
      setJumpPage(p.toString());
    }

    setTextFieldValue(searchParams.get("search") || "");
    const sizesParam = searchParams.get("sizes");
    setSelectedSizes(sizesParam ? sizesParam.split(",") : []);
  }, [pageNum, searchParams]);

  // Recompute visible page whenever filters/page change
  useEffect(() => {
    if (!kurtiData.length) return;
    updatePaginationView(kurtiData, currentPage);
  }, [kurtiData, currentPage, textFieldValue, selectedSizes]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          `/api/category/isexist?category=${code.toLowerCase()}`
        );
        const result = await response.json();

        if (result.data) {
          setValid(true);

          const [resPage, resKurti] = await Promise.all([
            fetch(`/api/kurti/countAvail?cat=${code.toLowerCase()}`),
            fetch(`/api/kurti/getByCategory?category=${code}`),
          ]);

          const kurtiRes = await resKurti.json();
          const kurtiList = kurtiRes.data || [];

          // ✅ Calculate total quantity per kurti
          kurtiList.forEach((kurti: kurti) => {
            const totalQty = (kurti.sizes || []).reduce(
              (sum, size) =>
                sum + (size?.quantity > 0 ? size?.quantity : 0 || 0),
              0
            );

            // ✅ Optional: Uncomment if you want to subtract reserved sizes
            // const reservedQty = (kurti.reservedSizes || []).reduce(
            //   (sum, size) => sum + (size?.quantity || 0),
            //   0
            // );
            // kurti.countOfPiece = totalQty - reservedQty;

            kurti.countOfPiece = totalQty;
          });

          // ✅ Sort kurtis by descending stock count
          const sortedByStock = kurtiList.sort(
            (a: kurti, b: kurti) =>
              (b.countOfPiece ?? 0) - (a.countOfPiece ?? 0)
          );

          setKurtiData(sortedByStock);
          // displayData/totalPages handled by filter effect
        } else {
          setValid(false);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
        setPageLoader(false);
      }
    };

    if (loading) {
      fetchData();
    }
  }, [loading]);

  return (
    <>
      {valid ? (
        <Card className="rounded-none w-full h-full border-none shadow-none text-left bg-gray-50/50">
          <CardHeader className="bg-white border-b py-4 px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-xl font-bold text-gray-800 uppercase tracking-wide">
              👜 Catalogue - {code}
            </p>
            <div className="w-full sm:max-w-xs md:max-w-sm">
              <SearchBar
                value={textFieldValue}
                onChange={(newValue) => handleSearch(newValue)}
                onCancelResearch={cancelSearch}
                width={"100%"}
                style={{
                  backgroundColor: "#fff",
                  border: "1px solid #e2e8f0",
                  width: "100%",
                  borderRadius: "8px",
                }}
              />
            </div>
          </CardHeader>
          <CardContent className="p-6 max-w-7xl mx-auto space-y-6">

            {/* Size Filter */}
            <div className="flex flex-col gap-2">
              <details className="rounded-md border bg-white">
                <summary className="cursor-pointer select-none px-3 py-2 font-medium">
                  Size Filter
                  {selectedSizes.length > 0 ? ` (${selectedSizes.length})` : ""}
                </summary>
                <div className="px-3 pb-3">
                  <div className="flex flex-wrap gap-3 pt-2">
                    {getAvailableSizes(kurtiData).map((size) => {
                      const checked = selectedSizes.includes(size);
                      return (
                        <label
                          key={size}
                          className="flex items-center gap-2 rounded-md border px-2 py-1 cursor-pointer hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const nextChecked = e.target.checked;
                              const nextSizes = new Set(selectedSizes);
                              if (nextChecked) nextSizes.add(size);
                              else nextSizes.delete(size);
                              router.replace(buildUrl(1, textFieldValue, Array.from(nextSizes)));
                            }}
                          />
                          <span className="text-sm font-medium">{size}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={selectedSizes.length === 0}
                      onClick={() => {
                        router.replace(buildUrl(1, textFieldValue, []));
                      }}
                    >
                      Clear sizes
                    </Button>
                  </div>
                </div>
              </details>
            </div>

            {/* Selection and Multi-Delete Bar */}
            <div className="mt-4 flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-3.5 shadow-xs">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="text-xs font-bold bg-white"
                >
                  {displayData.length > 0 &&
                  displayData.every((variants) => variants[0] && selectedIds.includes(variants[0].id))
                    ? "Deselect All"
                    : "Select All Page"}
                </Button>
                {selectedIds.length > 0 && (
                  <span className="text-xs font-bold text-gray-500">
                    {selectedIds.length} selected
                  </span>
                )}
              </div>

              {selectedIds.length > 0 && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1"
                >
                  🗑️ Delete Selected ({selectedIds.length})
                </Button>
              )}
            </div>
          </CardContent>

          <CardContent className="w-full flex flex-wrap justify-center gap-4">
            {loading || pageLoader ? (
              Array.from({ length: 8 }).map((_, idx) => (
                <KurtiCardSkeleton key={idx} />
              ))
            ) : displayData.length === 0 ? (
              <div className="text-center py-20 text-gray-400 font-semibold w-full">
                No products found in this category.
              </div>
            ) : (
              displayData.map((variantsList, i) => {
                const primaryVariant = variantsList[0];
                if (!primaryVariant) return null;
                
                const isSelected = selectedIds.includes(primaryVariant.id);
                
                return (
                  <div key={i} className="relative group">
                    {/* Select Checkbox Checkmark */}
                    <div className="absolute top-3 left-3 z-20 flex items-center justify-center bg-white/95 border border-gray-200 rounded-lg p-1.5 shadow-sm hover:scale-105 transition-all">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectKurti(primaryVariant.id)}
                        className="w-4 h-4 accent-red-600 cursor-pointer"
                      />
                    </div>
                    <KurtiPicCard
                      data={variantsList}
                      onKurtiDelete={handleKurtiDelete}
                    />
                  </div>
                );
              })
            )}
          </CardContent>

          {!loading && (
            <div className="space-y-4">
              <Pagination style={{ margin: "20px 0" }}>
                <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    className="cursor-pointer"
                    isActive={currentPage > 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                  />
                </PaginationItem>

                {currentPage > 2 && (
                  <>
                    <PaginationItem>
                      <PaginationLink onClick={() => handlePageChange(1)}>
                        1
                      </PaginationLink>
                    </PaginationItem>
                    {currentPage > 3 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                  </>
                )}

                {currentPage - 1 >= 1 && (
                  <PaginationItem>
                    <PaginationLink
                      onClick={() => handlePageChange(currentPage - 1)}
                    >
                      {currentPage - 1}
                    </PaginationLink>
                  </PaginationItem>
                )}

                <PaginationItem>
                  <PaginationLink isActive>{currentPage}</PaginationLink>
                </PaginationItem>

                {currentPage + 1 <= totalPages && (
                  <PaginationItem>
                    <PaginationLink
                      onClick={() => handlePageChange(currentPage + 1)}
                    >
                      {currentPage + 1}
                    </PaginationLink>
                  </PaginationItem>
                )}

                {currentPage + 2 < totalPages && (
                  <>
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLink
                        onClick={() => handlePageChange(totalPages)}
                      >
                        {totalPages}
                      </PaginationLink>
                    </PaginationItem>
                  </>
                )}

                <PaginationItem>
                  <PaginationNext
                    isActive={currentPage < totalPages}
                    className="cursor-pointer"
                    onClick={() => handlePageChange(currentPage + 1)}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>

            <div className="flex items-center justify-center gap-2 pb-6">
              <span className="text-xs font-semibold text-gray-500">Go to page:</span>
              <Input
                type="number"
                min={1}
                max={totalPages}
                value={jumpPage}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJumpPage(e.target.value)}
                className="w-16 h-8 text-xs text-center border-gray-300 bg-white"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleJumpToPage();
                  }
                }}
              />
              <span className="text-xs text-gray-400 font-semibold">of {totalPages}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleJumpToPage}
                className="h-8 text-xs font-bold px-3 bg-white"
              >
                Go
              </Button>
            </div>
          </div>
        )}

          <Dialog open={deleteConfirmOpen} onOpenChange={(open) => {
            setDeleteConfirmOpen(open);
            if (!open) setDeletePassword("");
          }}>
            <DialogContent className="sm:max-w-[425px] bg-white border border-gray-200">
              <DialogHeader>
                <DialogTitle>Delete Selected Products</DialogTitle>
                <DialogDescription>
                  Are you sure you want to permanently delete the <span className="font-bold text-gray-900">{selectedIds.length}</span> selected products? This action cannot be undone.
                  <br />
                  <span className="font-semibold text-red-600 block mt-1">
                    Please enter the delete password to confirm.
                  </span>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-2">
                <Input
                  type="password"
                  placeholder="Enter delete password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="border-red-300 focus:border-red-500 focus:ring-red-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleDeleteSelected();
                    }
                  }}
                />
              </div>
              <DialogFooter className="gap-2 pt-2 border-t mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDeleteConfirmOpen(false);
                    setDeletePassword("");
                  }}
                  className="text-xs h-9 px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteSelected}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs h-9 px-4"
                >
                  Delete Selected
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Card>
      ) : (
        <NotValidKurtiCode />
      )}
    </>
  );
}

const KurtiListPageHelper = () => {
  return (
    <RoleGateForComponent
      allowedRole={[
        UserRole.ADMIN,
        UserRole.UPLOADER,
        UserRole.SELLER,
        UserRole.RESELLER,
      ]}
    >
      <Suspense fallback={<PageLoader loading={true} />}>
        <KurtiListPage />
      </Suspense>
    </RoleGateForComponent>
  );
};

export default KurtiListPageHelper;
