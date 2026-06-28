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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { Skeleton } from "@/src/components/ui/skeleton";

function ProductEditorSkeleton() {
  return (
    <div className="space-y-6">
      {/* Tabs List Skeleton */}
      <div className="grid grid-cols-3 gap-2 bg-gray-150 p-1 rounded-xl h-12 w-full animate-pulse">
        <Skeleton className="h-full w-full bg-white rounded-lg" />
        <Skeleton className="h-full w-full bg-transparent rounded-lg" />
        <Skeleton className="h-full w-full bg-transparent rounded-lg" />
      </div>

      {/* Specifications Card Skeleton */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
              <Skeleton className="h-9 w-full bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="pt-4 flex justify-end">
          <Skeleton className="h-9 w-32 bg-gray-200 rounded-lg animate-pulse" />
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
          `/api/kurti/getByCode?code=${paths[3].toLowerCase()}`
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
        <CardContent className="p-6 max-w-4xl mx-auto space-y-6">
          {loader ? (
            <ProductEditorSkeleton />
          ) : (
            <>
              {/* Swatches switcher */}
              {siblings.length > 1 && (
                <Card className="shadow-sm border-gray-200 mb-6">
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

              {/* Modern Tabs Section */}
              <Tabs defaultValue="specifications" className="w-full space-y-6">
                <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 rounded-xl">
                  <TabsTrigger
                    value="specifications"
                    className="rounded-lg py-2.5 text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
                  >
                    ✏️ Specs & Info
                  </TabsTrigger>
                  <TabsTrigger
                    value="images"
                    className="rounded-lg py-2.5 text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
                  >
                    📸 Images ({kurtiData?.images?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger
                    value="videos"
                    className="rounded-lg py-2.5 text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
                  >
                    🎥 Videos ({kurtiData?.videos?.length || 0})
                  </TabsTrigger>
                </TabsList>

                {/* Specifications Tab */}
                <TabsContent value="specifications">
                  <Card className="shadow-sm border-gray-200 bg-white">
                    <CardContent className="p-6">
                      {kurtiData ? (
                        <KurtiUpdate data={kurtiData} onKurtiUpdate={handleKurtiUpdate} />
                      ) : (
                        ""
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Images Tab */}
                <TabsContent value="images" className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Manage Product Images</h3>
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
                </TabsContent>

                {/* Videos Tab */}
                <TabsContent value="videos" className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Manage Product Videos</h3>
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
                </TabsContent>
              </Tabs>
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
