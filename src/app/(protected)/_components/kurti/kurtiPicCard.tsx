"use client";

import { RoleGateForComponent } from "@/src/components/auth/role-gate-component";
import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { UserRole } from "@prisma/client";
import axios from "axios";
import { Loader2, Download, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { ImageWatermark } from "watermark-js-plus";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";

interface kurti {
  id: string;
  category: string;
  code: string;
  images: any[];
  sizes: any[];
  reservedSizes?: any[];
  party: string;
  sellingPrice: string;
  actualPrice: string;
  color?: string;
  isBigPrice?: boolean;
  bigPrice?: string;
  videos?: any[];
}

interface KurtiPicCardProps {
  data: any; // A single kurti object or a list of grouped variant kurtis
  onKurtiDelete: (data: any) => void;
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

const KurtiPicCard: React.FC<KurtiPicCardProps> = ({ data, onKurtiDelete }) => {
  const variants = useMemo<kurti[]>(() => {
    return Array.isArray(data) ? data : [data];
  }, [data]);

  const [activeIdx, setActiveIdx] = useState(0);
  
  // Reset active index if variants list changes
  useEffect(() => {
    setActiveIdx(0);
  }, [variants]);

  const activeVariant = useMemo<kurti>(() => {
    return variants[activeIdx] || variants[0] || data;
  }, [variants, activeIdx, data]);

  const [downloading, setDownloading] = useState(false);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [stockString, setStockString] = useState(``);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  const selectSizes = useMemo(() => [
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
  ], []);

  const pathname = usePathname();

  const sortedAvailableSizes = useMemo(() => {
    const sizesArray: any[] = activeVariant.sizes || [];
    const reservedArray: any[] = activeVariant.reservedSizes || [];
    
    const getStockForSize = (sizeName: string) => {
      const szObj = sizesArray.find((s) => s.size?.toUpperCase() === sizeName.toUpperCase());
      const resObj = reservedArray.find((r) => r.size?.toUpperCase() === sizeName.toUpperCase());
      const qty = szObj ? szObj.quantity : 0;
      const res = resObj ? resObj.quantity : 0;
      return Math.max(0, qty - res);
    };

    return selectSizes.map(sizeName => {
      const stock = getStockForSize(sizeName);
      return { size: sizeName, stock };
    });
  }, [activeVariant.sizes, activeVariant.reservedSizes, selectSizes]);

  useEffect(() => {
    if (!activeVariant?.images?.[0]?.url) {
      return;
    }

    const img = new Image();
    img.src = activeVariant.images[0].url;

    img.onload = () => {
      setDimensions({ width: img.width, height: img.height });
    };

    img.onerror = (error) => {
      console.error("Error loading image:", error);
    };

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [activeVariant.images]);

  const handleDelete = async () => {
    if (!deletePassword.trim()) {
      toast.error("Please enter the delete password");
      return;
    }

    const expectedPassword = process.env.NEXT_PUBLIC_DELETE_PASSWORD;
    if (deletePassword !== expectedPassword) {
      toast.error("Invalid password");
      return;
    }

    try {
      const res = await fetch(
        `/api/kurti/delete?cat=${activeVariant?.category}&code=${activeVariant?.code}`
      );
      const result = await res.json();
      await onKurtiDelete(result.data);
      toast.success("Successfully deleted product");
      setDeleteDialogOpen(false);
      setDeletePassword("");
    } catch (e: any) {
      console.error(e.message);
      toast.error("Failed to delete");
    }
  };

  const applyWatermarkToImage = async (
    imageSrc: string,
    rightText: string,
    leftText: string
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = async () => {
        try {
          const originalWidth = img.naturalWidth || img.width;
          const originalHeight = img.naturalHeight || img.height;

          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          canvas.width = originalWidth;
          canvas.height = originalHeight;

          ctx?.drawImage(img, 0, 0, originalWidth, originalHeight);

          const tempContainer = document.createElement("div");
          tempContainer.style.position = "absolute";
          tempContainer.style.left = "-9999px";
          tempContainer.style.top = "-9999px";
          document.body.appendChild(tempContainer);

          const tempImg = document.createElement("img");
          tempImg.src = canvas.toDataURL("image/jpeg", 1.0);
          tempImg.width = originalWidth;
          tempImg.height = originalHeight;
          tempContainer.appendChild(tempImg);

          tempImg.onload = async () => {
            try {
              const watermark1 = new ImageWatermark({
                contentType: "image",
                image: rightText,
                imageWidth: originalWidth / 10,
                imageHeight: originalHeight / 27,
                width: originalWidth,
                height: originalHeight,
                dom: tempImg,
                rotate: 0,
                globalAlpha: 1,
                translatePlacement: "top-end",
              });

              const watermark2 = new ImageWatermark({
                contentType: "image",
                image: leftText,
                imageWidth: originalWidth / 6,
                imageHeight: originalHeight / 16,
                width: originalWidth,
                height: originalHeight,
                dom: tempImg,
                rotate: 0,
                globalAlpha: 1,
                translatePlacement: "top-start",
              });

              await watermark1.create();
              await watermark2.create();

              const finalCanvas = document.createElement("canvas");
              const finalCtx = finalCanvas.getContext("2d");
              finalCanvas.width = originalWidth;
              finalCanvas.height = originalHeight;

              finalCtx?.drawImage(tempImg, 0, 0, originalWidth, originalHeight);

              finalCanvas.toBlob(
                (blob) => {
                  if (tempContainer && tempContainer.parentNode) {
                    document.body.removeChild(tempContainer);
                  }
                  if (blob) {
                    resolve(blob);
                  } else {
                    reject(
                      new Error("Failed to convert watermarked image to blob")
                    );
                  }
                },
                "image/jpeg",
                0.95
              );
            } catch (error) {
              if (tempContainer && tempContainer.parentNode) {
                document.body.removeChild(tempContainer);
              }
              reject(error);
            }
          };

          tempImg.onerror = () => {
            if (tempContainer && tempContainer.parentNode) {
              document.body.removeChild(tempContainer);
            }
            reject(new Error("Failed to load temporary image"));
          };
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = imageSrc;
    });
  };

  const findBlocks = async () => {
    let sizesArray: any[] = [...(activeVariant.sizes || [])];
    sizesArray.sort(
      (a, b) => selectSizes.indexOf(a.size) - selectSizes.indexOf(b.size)
    );
    let ele = [];
    let blocks: string = ``;
    let stk = ``;
    for (let i = 0; i < sizesArray.length; i++) {
      ele.push(selectSizes.indexOf(sizesArray[i].size?.toUpperCase()));
      if (selectSizes.indexOf(sizesArray[i].size?.toUpperCase()) > 0) {
        ele.push(selectSizes.indexOf(sizesArray[i].size?.toUpperCase()) - 1);
      }
      stk += `${sizesArray[i].size?.toUpperCase()} - ${
        sizesArray[i].quantity
      }\n`;
    }
    setStockString(stk);
    ele.sort((a, b) => a - b);
    for (let i = 0; i < ele.length; i++) {
      if (i === 0 || ele[i] !== ele[i - 1]) {
        blocks += `\u2063  ${selectSizes[ele[i]]}`;
      }
    }
    let url = process.env.NEXT_PUBLIC_SERVER_URL + `/genImg?text=${blocks}`;
    const res = await axios.get(url);
    let url2 =
      process.env.NEXT_PUBLIC_SERVER_URL +
      `/genImg2?text=${activeVariant.code?.toUpperCase()}`;
    const res2 = await axios.get(url2);

    return { leftText: res.data, rightText: res2.data };
  };

  const downloadAllImagesDirectly = async () => {
    let processingToastId: string | number | undefined;

    try {
      setDownloading(true);
      processingToastId = toast.loading("Starting download process...");

      const { leftText, rightText } = await findBlocks();

      const filteredData = activeVariant.images?.filter(
        (image: { url: string; is_hidden: boolean; id: string }) =>
          image.is_hidden === false
      ) || [];

      for (let i = 0; i < filteredData.length; i++) {
        const imageUrl = filteredData[i].url;
        const filename = `${activeVariant.code.toLowerCase()}_image_${i + 1}.jpg`;

        toast.loading(`Processing image ${i + 1}/${filteredData.length}...`, {
          id: processingToastId,
        });

        try {
          const blob = await applyWatermarkToImage(
            imageUrl,
            rightText,
            leftText
          );

          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          if (link.parentNode) {
            document.body.removeChild(link);
          }

          URL.revokeObjectURL(url);
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Error processing image ${i + 1}:`, error);
          toast.error(`Failed to process image ${i + 1}`, { duration: 2000 });
        }
      }

      toast.dismiss(processingToastId);
      toast.success("All images downloaded successfully!");
    } catch (error) {
      console.error("Error downloading images:", error);
      if (processingToastId) {
        toast.dismiss(processingToastId);
      }
      toast.error("Failed to download images");
    } finally {
      setDownloading(false);
      setDownloadDialogOpen(false);
    }
  };

  const downloadAllVideosDirectly = async () => {
    let processingToastId: string | number | undefined;

    try {
      if (activeVariant.videos && activeVariant.videos.length > 0) {
        setDownloading(true);
        processingToastId = toast.loading("Starting video download process...");
        const videoData = activeVariant.videos;

        for (let i = 0; i < videoData.length; i++) {
          const videoUrl = videoData[i].url;
          const filename = `${activeVariant.code.toLowerCase()}_video_${i + 1}.mp4`;

          toast.loading(`Processing video ${i + 1}/${videoData.length}...`, {
            id: processingToastId,
          });

          try {
            const response = await fetch(videoUrl);
            const blob = await response.blob();

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            if (link.parentNode) {
              document.body.removeChild(link);
            }

            URL.revokeObjectURL(url);
            await new Promise((resolve) => setTimeout(resolve, 500));
          } catch (error) {
            console.error(`Error processing video ${i + 1}:`, error);
            toast.error(`Failed to process video ${i + 1}`, { duration: 2000 });
          }
        }

        toast.dismiss(processingToastId);
        toast.success("All videos downloaded successfully!");
      }
    } catch (error) {
      console.error("Error downloading videos:", error);
      if (processingToastId) {
        toast.dismiss(processingToastId);
      }
      toast.error("Failed to download videos");
    } finally {
      setDownloading(false);
      setDownloadDialogOpen(false);
    }
  };

  return (
    <div
      id="container"
      className="group w-[300px] bg-white rounded-2xl shadow-md hover:shadow-xl border border-gray-100 overflow-hidden transition-all duration-300 flex flex-col justify-between"
    >
      {/* Hidden container for watermark source image */}
      <div className="w-[2200px] h-[2200px]" hidden>
        {activeVariant.images?.[0]?.url && (
          <img
            id={`download${activeVariant.code}`}
            className="w-full h-full object-cover"
            src={activeVariant.images[0].url}
            crossOrigin="anonymous"
            width={dimensions.width}
            height={dimensions.height}
            alt=""
          />
        )}
      </div>

      {/* Main Image */}
      <div className="relative h-72 w-full overflow-hidden bg-gray-50 border-b border-gray-100">
        {activeVariant.images?.[0]?.url ? (
          <img
            src={activeVariant.images[0].url}
            id={`${activeVariant.code}-visible`}
            alt={activeVariant.code}
            crossOrigin="anonymous"
            loading="lazy"
            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
            No Image
          </div>
        )}
        
        {/* Category Label */}
        <span className="absolute top-3 left-3 bg-black/75 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
          {activeVariant.category}
        </span>
        
        {/* Color Badge */}
        {activeVariant.color && (
          <span className="absolute top-3 right-3 bg-blue-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded capitalize shadow-sm">
            {activeVariant.color}
          </span>
        )}
      </div>

      {/* Details Box */}
      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          {/* Title / Code */}
          <div className="flex items-center justify-between">
            <span className="bg-gray-100 text-gray-800 text-xs font-bold px-2.5 py-1 rounded-md border border-gray-200">
              Code: {activeVariant.code?.toUpperCase()}
            </span>
            <span className="text-[10px] text-gray-500 font-medium">
              {activeVariant.images?.length || 0} Images
            </span>
          </div>

          {/* Pricing */}
          <div className="flex flex-col gap-0.5">
            <span className="text-lg font-bold text-gray-900">
              ₹{activeVariant.sellingPrice}/-
            </span>
            {activeVariant.isBigPrice && activeVariant.bigPrice && (
              <span className="text-xs text-blue-600 font-semibold">
                Big Size: ₹{parseFloat(activeVariant.bigPrice) + parseFloat(activeVariant.sellingPrice)}/-
              </span>
            )}
          </div>

          {/* Swatch circle indicators */}
          {variants.length > 1 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Available Colors ({variants.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {variants.map((v, idx) => {
                  const hex = getColorHex(v.color || "");
                  const isActive = idx === activeIdx;
                  return (
                    <button
                      key={v.code}
                      type="button"
                      onClick={() => setActiveIdx(idx)}
                      title={`${v.color || "Variant"} (${v.code})`}
                      className={`w-6 h-6 rounded-full border transition-all ${
                        isActive
                          ? "ring-2 ring-blue-500 ring-offset-1 border-transparent scale-110 shadow-sm"
                          : "border-gray-200 hover:scale-105"
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Size badging system */}
          <div className="space-y-1 pt-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Stock Inventory
            </span>
            <div className="flex flex-wrap gap-1.5">
              {sortedAvailableSizes.map((item) => (
                <div
                  key={item.size}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors flex items-center gap-1 ${
                    item.stock > 0
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-gray-50 text-gray-400 border-gray-100 opacity-50"
                  }`}
                >
                  <span>{item.size}</span>
                  <span className={`px-1 rounded text-[9px] font-extrabold ${
                    item.stock > 0 
                      ? "bg-green-200 text-green-800" 
                      : "bg-gray-200 text-gray-500"
                  }`}>
                    {item.stock}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Buttons footer */}
        <div className="flex items-center gap-2 pt-3 border-t border-gray-100 mt-2">
          <Button
            type="button"
            onClick={async () => {
              await downloadAllImagesDirectly();
              await downloadAllVideosDirectly();
            }}
            variant="outline"
            disabled={downloading}
            className="flex-1 text-xs border-gray-200 text-gray-700 hover:bg-gray-50 h-9 font-medium"
          >
            {downloading ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 mr-1.5" />
            )}
            Download
          </Button>

          <RoleGateForComponent allowedRole={[UserRole.ADMIN, UserRole.UPLOADER]}>
            <Link
              href={
                pathname.split("/").length !== 2
                  ? `${pathname}/${activeVariant.code.toLowerCase()}`
                  : `${pathname}/${activeVariant.category.toLowerCase()}/${activeVariant.code.toLowerCase()}`
              }
              className="flex-shrink-0"
            >
              <Button
                type="button"
                variant="outline"
                className="w-9 h-9 p-0 border-gray-200 hover:bg-gray-50 text-gray-600"
              >
                ✏️
              </Button>
            </Link>

            <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
              setDeleteDialogOpen(open);
              if (!open) setDeletePassword("");
            }}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="destructive"
                  className="w-9 h-9 p-0 bg-red-50 hover:bg-red-100 text-red-600 border-none shadow-none"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] bg-white border border-gray-200">
                <DialogHeader>
                  <DialogTitle>Delete Variant</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete this variant <span className="font-bold text-gray-900">{activeVariant.code}</span>?
                    <br />
                    <span className="font-semibold text-red-600 block mt-1">
                      This action cannot be undone. Please enter the delete password to confirm.
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
                        handleDelete();
                      }
                    }}
                  />
                </div>
                <DialogFooter className="gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDeleteDialogOpen(false);
                      setDeletePassword("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </RoleGateForComponent>
        </div>
      </div>
    </div>
  );
};

export default KurtiPicCard;
