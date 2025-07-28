"use client";

import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
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

  const [valid, setValid] = useState(true);
  const [kurtiData, setKurtiData] = useState<kurti[]>([]);
  const [displayData, setDisplayData] = useState<kurti[]>([]);
  const [textFieldValue, setTextFieldValue] = useState("");
  const [currentPage, setCurrentPage] = useState(parseInt(pageNum));
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pageLoader, setPageLoader] = useState(true);

  const handleSearch = (newVal: string) => {
    if (newVal === "") {
      setTextFieldValue("");
      setDisplayData(
        kurtiData.slice(
          20 * (parseInt(pageNum) - 1),
          20 * (parseInt(pageNum) - 1) + 20
        )
      );
    } else {
      setTextFieldValue(newVal);
      const filteredRows = kurtiData
        .filter((row) => row.code.toUpperCase().includes(newVal.toUpperCase()))
        .slice(0, 20);
      setDisplayData(filteredRows);
    }
  };

  const cancelSearch = () => {
    setTextFieldValue("");
    handleSearch("");
  };

  const handleKurtiDelete = async (data: kurti[]) => {
    await setKurtiData([...data]);
    setLoading(true);
  };

  const handlePageChange = (page: number) => {
    if (page <= totalPages && page >= 1) {
      router.replace(`${baseUrl}${page}`);
    }
  };

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

          // ✅ Setup pagination
          setDisplayData(
            sortedByStock.slice(
              20 * (parseInt(pageNum) - 1),
              20 * (parseInt(pageNum) - 1) + 20
            )
          );
          setKurtiData(sortedByStock);
          setTotalPages(Math.ceil(sortedByStock.length / 20));
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
