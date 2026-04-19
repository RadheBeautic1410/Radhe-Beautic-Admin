"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
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
import { sortSizesByCatalogueKind } from "@/src/lib/kurtiSizes";

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
  const searchParams = useSearchParams();
  const code = path[2];
  const pageNum = path[4];
  const baseUrl = pathname.substring(0, pathname.indexOf("page/") + 5);

  /** Sizes live in the URL so pagination remounts do not drop the filter. */
  const selectedSizes = useMemo(() => {
    const raw = searchParams.get("sizes");
    if (!raw) return [];
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [searchParams]);

  const normSize = (s: string) => s.trim().toLowerCase();

  const buildCatalogueUrl = (page: number, sizesOverride?: string[] | null) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (sizesOverride !== undefined && sizesOverride !== null) {
      if (sizesOverride.length) sp.set("sizes", sizesOverride.join(","));
      else sp.delete("sizes");
    }
    const q = sp.toString();
    return `${baseUrl}${page}${q ? `?${q}` : ""}`;
  };

  const [valid, setValid] = useState(true);
  const [kurtiData, setKurtiData] = useState<kurti[]>([]);
  const [displayData, setDisplayData] = useState<kurti[]>([]);
  const [textFieldValue, setTextFieldValue] = useState("");
  const [currentPage, setCurrentPage] = useState(parseInt(pageNum));
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pageLoader, setPageLoader] = useState(true);
  const [categoryIsForChildren, setCategoryIsForChildren] = useState(false);

  const getAvailableSizes = (data: kurti[]) => {
    const set = new Set<string>();
    for (const k of data) {
      for (const s of k.sizes || []) {
        if (!s?.size) continue;
        if ((s.quantity ?? 0) > 0) set.add(String(s.size).trim());
      }
    }
    return sortSizesByCatalogueKind(Array.from(set), categoryIsForChildren);
  };

  const applyFilters = (data: kurti[]) => {
    const search = textFieldValue.trim();
    return data.filter((row) => {
      const matchesSearch =
        search.length === 0 || row.code.toUpperCase().includes(search.toUpperCase());

      // Multiple sizes = AND: kurti must have every selected size in stock
      const matchesSize =
        selectedSizes.length === 0 ||
        selectedSizes.every((req) =>
          (row.sizes || []).some(
            (s) =>
              normSize(String(s.size)) === normSize(req) &&
              (s.quantity ?? 0) > 0
          )
        );

      return matchesSearch && matchesSize;
    });
  };

  const updatePaginationView = (allRows: kurti[], page: number) => {
    const filtered = applyFilters(allRows);
    const pages = Math.max(1, Math.ceil(filtered.length / 20));
    const safePage = Math.min(Math.max(page, 1), pages);
    setTotalPages(pages);
    setDisplayData(filtered.slice(20 * (safePage - 1), 20 * (safePage - 1) + 20));
  };

  const handleSearch = (newVal: string) => {
    setTextFieldValue(newVal);
    // Keep URL + pagination consistent when changing filters
    router.replace(buildCatalogueUrl(1));
  };

  const cancelSearch = () => {
    setTextFieldValue("");
    router.replace(buildCatalogueUrl(1));
  };

  const handleKurtiDelete = async (data: kurti[]) => {
    await setKurtiData([...data]);
    setLoading(true);
  };

  const handlePageChange = (page: number) => {
    if (page <= totalPages && page >= 1) {
      router.replace(buildCatalogueUrl(page));
    }
  };

  // Sync state when URL changes (e.g. user clicks pagination or uses back/forward)
  useEffect(() => {
    const p = parseInt(pageNum);
    if (!Number.isNaN(p)) setCurrentPage(p);
  }, [pageNum]);

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
          setCategoryIsForChildren(Boolean(result.isForChildren));

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
          setCategoryIsForChildren(false);
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
      <PageLoader loading={loading || pageLoader} />

      {valid ? (
        <Card className="rounded-none w-full h-full">
          <CardHeader>
            <p className="text-2xl font-semibold text-center">
              {`👜 Catalogue - ${code}`}
            </p>
          </CardHeader>
          <CardContent>
            <SearchBar
              value={textFieldValue}
              onChange={(newValue) => handleSearch(newValue)}
              onCancelResearch={cancelSearch}
              width={"100%"}
              style={{
                backgroundColor: "#fff",
                border: "1px solid #ccc",
                maxWidth: "400px",
                marginLeft: "auto",
              }}
            />

            {/* Size Filter */}
            <div className="mt-4 flex flex-col gap-2">
              <details className="rounded-md border bg-white">
                <summary className="cursor-pointer select-none px-3 py-2 font-medium">
                  Size Filter
                  {selectedSizes.length > 0 ? ` (${selectedSizes.length})` : ""}
                </summary>
                <div className="px-3 pb-3">
                  <div className="flex flex-wrap gap-3 pt-2">
                    {getAvailableSizes(kurtiData).map((size) => {
                      const checked = selectedSizes.some(
                        (s) => normSize(s) === normSize(size)
                      );
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
                              const next = new Set(
                                selectedSizes.filter(
                                  (s) => normSize(s) !== normSize(size)
                                )
                              );
                              if (nextChecked) next.add(size);
                              router.replace(buildCatalogueUrl(1, Array.from(next)));
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
                        router.replace(buildCatalogueUrl(1, []));
                      }}
                    >
                      Clear sizes
                    </Button>
                  </div>
                </div>
              </details>
            </div>
          </CardContent>

          <CardContent className="w-full flex flex-wrap justify-center gap-3">
            {displayData.map((data, i) => (
              <KurtiPicCard
                data={data}
                key={i}
                onKurtiDelete={handleKurtiDelete}
              />
            ))}
          </CardContent>

          {!loading && (
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
          )}
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
      <KurtiListPage />
    </RoleGateForComponent>
  );
};

export default KurtiListPageHelper;
