"use client";

import PageLoader from "@/src/components/loader";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import KurtiPicCardSingle from "../../../_components/kurti/kurtiPicCardSingle";
import KurtiUpdate from "../../../_components/kurti/kurtiUpdate";
import { RoleGateForComponent } from "@/src/components/auth/role-gate-component";
import NotAllowedPage from "../../../_components/errorPages/NotAllowedPage";
import { UserRole } from "@prisma/client";
import KurtiVideoCardSingle from "../../../_components/kurti/KurtiVideoSingle";
import Link from "next/link";
import { Skeleton } from "@/src/components/ui/skeleton";

function ProductEditorSkeleton() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start w-full">
      {/* Left side: specs and controls */}
      <div className="xl:col-span-5 space-y-6">
        <Skeleton className="h-40 w-full bg-gray-200 rounded-xl animate-pulse" />
        <Skeleton className="h-96 w-full bg-gray-200 rounded-xl animate-pulse" />
      </div>

      {/* Right side: images and videos */}
      <div className="xl:col-span-7 space-y-6">
        <Skeleton className="h-80 w-full bg-gray-200 rounded-xl animate-pulse" />
        <Skeleton className="h-80 w-full bg-gray-200 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

interface kurti {
  id: string;
  category: string;
  code: string;
  images: any[];
  sizes: any[];
  party: string;
  sellingPrice: string;
  actualPrice: string;
  customerPrice?: number;
  videos?: any[];
  color?: string;
  parentCode?: string;
}

const getColorHex = (colorName: string) => {
  const colorsMap: Record<string, string> = {
    black: "#1a1a1a",
    white: "#ffffff",
    red: "#ef4444",
    blue: "#3b82f6",
    green: "#22c55e",
    yellow: "#eab308",
    pink: "#ec4899",
    orange: "#f97316",
    purple: "#a855f7",
    brown: "#78350f",
    grey: "#6b7280",
    gray: "#6b7280",
    navyblue: "#1e3a8a",
    maroon: "#7f1d1d",
    beige: "#f5f5dc",
    mustard: "#ca8a04",
    peach: "#ffdbac",
    olivegreen: "#556b2f",
    indigo: "#4f46e5",
    turquoise: "#06b6d4",
  };
  const normalized = colorName.toLowerCase().replace(/\s+/g, "");
  return colorsMap[normalized] || "#cbd5e1";
};

function OneKurtiPage() {
  const [kurtiData, setKurtiData] = useState<kurti>();
  const [siblings, setSiblings] = useState<kurti[]>([]);
  const [loader, setLoader] = useState(true);
  const [valid, setValid] = useState(true);
  const [loading, setLoading] = useState(true);

  const pathname = usePathname();
  let paths = pathname.split("/");

  const handleKurtiUpdate = async (data: kurti) => {
    setKurtiData(data);
    setLoading(true);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          `/api/kurti/getByCode?code=${paths[3].toLowerCase()}`,
          { cache: "no-store" }
        );
        const result = await response.json();
        
        if (result.data) {
          setKurtiData(result.data);
          setValid(true);

          // Fetch all variants in this category to construct the siblings switcher
          const parentKey = result.data.parentCode || result.data.code;
          const siblingsResponse = await fetch(
            `/api/kurti/getByCategory?category=${paths[2].toLowerCase()}`
          );
          const siblingsResult = await siblingsResponse.json();
          
          if (Array.isArray(siblingsResult.data)) {
            const family = siblingsResult.data.filter(
              (item: any) => (item.parentCode || item.code) === parentKey
            );
            setSiblings(family);
          }
        } else {
          setValid(false);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoader(false);
        setLoading(false);
      }
    };
    
    if (loading) {
      fetchData();
    }
  }, [loading, paths]);

  return (
    <>
      <Card className="rounded-none w-full h-full border-none shadow-none text-left bg-gray-50/50">
        <CardHeader className="bg-white border-b py-4">
          <p className="text-2xl font-bold text-gray-800 text-center uppercase tracking-wide">
            👗 Product Details: {paths[3]}
          </p>
        </CardHeader>
        <CardContent className="p-6 w-full space-y-6">
          {loader ? (
            <ProductEditorSkeleton />
          ) : (
            <>
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start w-full">
                {/* Left side: specs and controls */}
                <div className="xl:col-span-5 space-y-6 w-full">
                  {/* Swatches switcher */}
                  {siblings.length > 1 && (
                    <Card className="shadow-sm border-gray-200">
                      <CardContent className="p-4 flex flex-col items-center space-y-2.5">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Product Color Variants ({siblings.length})
                        </span>
                        <div className="flex flex-wrap gap-2.5 justify-center">
                          {siblings.map((sib) => {
                            const hex = getColorHex(sib.color || "");
                            const isActive = sib.code.toLowerCase() === paths[3].toLowerCase();
                            return (
                              <Link
                                key={sib.code}
                                href={`/catalogue/${paths[2].toLowerCase()}/${sib.code.toLowerCase()}`}
                                title={`${sib.color || "Variant"} (${sib.code})`}
                                className={`w-8 h-8 rounded-full border transition-all flex items-center justify-center ${
                                  isActive
                                    ? "ring-2 ring-blue-500 ring-offset-2 border-transparent scale-110 shadow"
                                    : "border-gray-200 hover:scale-105 hover:border-gray-400"
                                }`}
                                style={{ backgroundColor: hex }}
                                onClick={() => {
                                  if (!isActive) {
                                    setLoader(true);
                                    setLoading(true);
                                  }
                                }}
                              >
                                {isActive && (
                                  <span className={`w-2 h-2 rounded-full ${sib.color?.toLowerCase() === "white" ? "bg-black" : "bg-white"}`} />
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {kurtiData && (
                    <KurtiUpdate data={kurtiData} onKurtiUpdate={handleKurtiUpdate} />
                  )}
                </div>

                {/* Right side: images and videos */}
                <div className="xl:col-span-7 space-y-6 w-full">
                  {/* Images Gallery */}
                  <Card className="shadow-sm border-gray-200 bg-white">
                    <CardHeader className="border-b py-3 bg-gray-50">
                      <p className="text-sm font-bold text-gray-800">📸 Product Images ({kurtiData?.images?.length || 0})</p>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      {kurtiData?.images && kurtiData.images.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {kurtiData.images.map((img, idx) => (
                            <Card key={img.id || idx} className="overflow-hidden border border-gray-200 hover:shadow-md transition-all">
                              <CardContent className="p-2">
                                <KurtiPicCardSingle
                                  data={kurtiData}
                                  idx={idx}
                                  onPicDelete={handleKurtiUpdate}
                                  onImageToggle={handleKurtiUpdate}
                                />
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300 text-gray-400 font-semibold">
                          No images uploaded for this variant.
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Videos Gallery */}
                  <Card className="shadow-sm border-gray-200 bg-white">
                    <CardHeader className="border-b py-3 bg-gray-50">
                      <p className="text-sm font-bold text-gray-800">🎥 Product Videos ({kurtiData?.videos?.length || 0})</p>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      {kurtiData?.videos && kurtiData.videos.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {kurtiData.videos.map((video, idx) => (
                            <Card key={video.id || idx} className="overflow-hidden border border-gray-200 hover:shadow-md transition-all">
                              <CardContent className="p-2">
                                <KurtiVideoCardSingle
                                  data={kurtiData}
                                  idx={idx}
                                  onVideoDelete={handleKurtiUpdate}
                                  onVideoToggle={handleKurtiUpdate}
                                />
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300 text-gray-400 font-semibold">
                          No videos uploaded for this variant.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}

const CatalogueKurtiHelper = () => {
  return (
    <>
      <RoleGateForComponent allowedRole={[UserRole.ADMIN, UserRole.UPLOADER]}>
        <OneKurtiPage />
      </RoleGateForComponent>
      <RoleGateForComponent allowedRole={[UserRole.SELLER, UserRole.RESELLER]}>
        <NotAllowedPage />
      </RoleGateForComponent>
    </>
  );
};

export default CatalogueKurtiHelper;
