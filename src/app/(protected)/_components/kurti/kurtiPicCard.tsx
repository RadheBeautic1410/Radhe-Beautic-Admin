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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { UserRole } from "@prisma/client";
import axios from "axios";
import { log } from "console";
import { Loader2, Download } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { ImageWatermark } from "watermark-js-plus";
import NextImage from "next/image";
import { DialogDemo } from "@/src/components/dialog-demo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
// Import JSZip for creating zip files
import JSZip from "jszip";

interface kurti {
  id: string;
  category: string;
  code: string;
  images: any[];
  sizes: any[];
  party: string;
  sellingPrice: string;
  actualPrice: string;
}

interface KurtiPicCardProps {
  data: any;
  onKurtiDelete: (data: any) => void;
}

const KurtiPicCard: React.FC<KurtiPicCardProps> = ({ data, onKurtiDelete }) => {
  const [downloading, setDownloading] = useState(false);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [stockString, setStockString] = useState(``);
  let selectSizes: string[] = [
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
  const pathname = usePathname();
  let sizes = data.sizes.length;
  const [isBrowserMobile, setIsBrowserMobile] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!data?.images?.[0]?.url) {
      console.error("Image URL is not available");
      return;
    }

    const img = new Image();
    img.src = data.images[0].url;

    img.onload = () => {
      console.log("Image loaded:", img.width, img.height);
      setDimensions({ width: img.width, height: img.height });
    };

    img.onerror = (error) => {
      console.error("Error loading image:", error);
    };

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [data.images]);

  useEffect(() => {
    const handleResize = () => {
      setIsBrowserMobile(window.innerWidth < 992);
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleDelete = async () => {
    try {
      console.log("data", data);
      const res = await fetch(
        `/api/kurti/delete?cat=${data?.category}&code=${data?.code}`
      );
      const result = await res.json();
      console.log("res", result);
      await onKurtiDelete(result.data);
    } catch (e: any) {
      console.log(e.message);
      toast.error("Failed to delete");
    }
  };

  // Helper function to convert image to canvas and get blob
  const imageToBlob = async (
    imageSrc: string,
    imageId: string
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = img.width;
        canvas.height = img.height;

        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to convert image to blob"));
            }
          },
          "image/jpeg",
          0.9
        );
      };

      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = imageSrc;
    });
  };

  // Helper function to apply watermark to image and return blob
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
          // Get original dimensions
          const originalWidth = img.naturalWidth || img.width;
          const originalHeight = img.naturalHeight || img.height;

          // Create canvas with original dimensions
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          canvas.width = originalWidth;
          canvas.height = originalHeight;

          // Draw original image at full resolution
          ctx?.drawImage(img, 0, 0, originalWidth, originalHeight);

          // Create temporary container for watermarking
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

          // Wait for temp image to load
          tempImg.onload = async () => {
            try {
              // Apply watermarks with original dimensions
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

              // Create final canvas with original dimensions
              const finalCanvas = document.createElement("canvas");
              const finalCtx = finalCanvas.getContext("2d");
              finalCanvas.width = originalWidth;
              finalCanvas.height = originalHeight;

              finalCtx?.drawImage(tempImg, 0, 0, originalWidth, originalHeight);

              finalCanvas.toBlob(
                (blob) => {
                  document.body.removeChild(tempContainer);
                  if (blob) {
                    resolve(blob);
                  } else {
                    reject(
                      new Error("Failed to convert watermarked image to blob")
                    );
                  }
                },
                "image/jpeg",
                0.95 // Higher quality
              );
            } catch (error) {
              document.body.removeChild(tempContainer);
              reject(error);
            }
          };

          tempImg.onerror = () => {
            document.body.removeChild(tempContainer);
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
    let sizesArray: any[] = data.sizes;
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
    console.log(stk);
    setStockString(stk);
    ele.sort((a, b) => a - b);
    let S1 = ``;
    for (let i = 0; i < ele.length; i++) {
      if (i === 0 || ele[i] !== ele[i - 1]) {
        blocks += `\u2063  ${selectSizes[ele[i]]}`;
      }
    }
    console.log(blocks, blocks.length);
    let url = process.env.NEXT_PUBLIC_SERVER_URL + `/genImg?text=${blocks}`;
    const res = await axios.get(url);
    console.log(res.data);
    let url2 =
      process.env.NEXT_PUBLIC_SERVER_URL +
      `/genImg2?text=${data.code?.toUpperCase()}`;
    const res2 = await axios.get(url2);

    return { leftText: res.data, rightText: res2.data };
  };

  // const downloadAllImagesAsZip = async () => {
  //   let processingToastId: string | number | undefined;

  //   try {
  //     setDownloading(true);

  //     processingToastId = toast.loading("Starting download process...");

  //     const { leftText, rightText } = await findBlocks();

  //     const zip = new JSZip();

  //     const filteredData = data.images?.filter(
  //       (image: { url: string; is_hidden: boolean; id: string }) =>
  //         image.is_hidden === false
  //     );

  //     for (let i = 0; i < filteredData.length; i++) {
  //       const imageUrl = filteredData[i].url;
  //       const filename = `${data.code.toLowerCase()}_image_${i + 1}.jpg`;

  //       toast.loading(`Processing image ${i + 1}/${filteredData.length}...`, {
  //         id: processingToastId,
  //       });

  //       try {
  //         const blob = await applyWatermarkToImage(
  //           imageUrl,
  //           rightText,
  //           leftText
  //         );

  //         zip.file(filename, blob);
  //       } catch (error) {
  //         console.error(`Error processing image ${i + 1}:`, error);
  //         toast.error(`Failed to process image ${i + 1}`, { duration: 2000 });
  //       }
  //     }

  //     toast.loading("Generating zip file...", {
  //       id: processingToastId,
  //     });

  //     const zipBlob = await zip.generateAsync({ type: "blob" });

  //     toast.loading("Starting download...", {
  //       id: processingToastId,
  //     });

  //     const url = URL.createObjectURL(zipBlob);
  //     const link = document.createElement("a");
  //     link.href = url;
  //     link.download = `${data.code.toLowerCase()}_images.zip`;
  //     document.body.appendChild(link);
  //     link.click();
  //     document.body.removeChild(link);

  //     // Clean up
  //     URL.revokeObjectURL(url);

  //     toast.dismiss(processingToastId);
  //     toast.success("All images downloaded successfully!");
  //   } catch (error) {
  //     console.error("Error downloading images:", error);
  //     if (processingToastId) {
  //       toast.dismiss(processingToastId);
  //     }
  //     toast.error("Failed to download images");
  //   } finally {
  //     setDownloading(false);
  //     setDownloadDialogOpen(false);
  //   }
  // };

  const downloadAllImagesDirectly = async () => {
    let processingToastId: string | number | undefined;

    try {
      setDownloading(true);

      processingToastId = toast.loading("Starting download process...");

      const { leftText, rightText } = await findBlocks();

      const filteredData = data.images?.filter(
        (image: { url: string; is_hidden: boolean; id: string }) =>
          image.is_hidden === false
      );

      for (let i = 0; i < filteredData.length; i++) {
        const imageUrl = filteredData[i].url;
        const filename = `${data.code.toLowerCase()}_image_${i + 1}.jpg`;

        toast.loading(`Processing image ${i + 1}/${filteredData.length}...`, {
          id: processingToastId,
        });

        try {
          const blob = await applyWatermarkToImage(
            imageUrl,
            rightText,
            leftText
          );

          // Create download link for individual image
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

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

  // const downloadAllVideosAsZip = async () => {
  //   let processingToastId: string | number | undefined;

  //   try {
  //     setDownloading(true);

  //     processingToastId = toast.loading("Starting video download process...");

  //     const zip = new JSZip();

  //     // Filter for video files (assuming there's a videos array or video URLs in your data)
  //     // You'll need to adjust this based on your actual data structure
  //     const videoData = data.videos || []; // Adjust this based on your data structure

  //     if (videoData.length === 0) {
  //       toast.error("No videos found to download");
  //       setDownloading(false);
  //       setDownloadDialogOpen(false);
  //       return;
  //     }

  //     for (let i = 0; i < videoData.length; i++) {
  //       const videoUrl = videoData[i].url;
  //       const filename = `${data.code.toLowerCase()}_video_${i + 1}.mp4`;

  //       toast.loading(`Processing video ${i + 1}/${videoData.length}...`, {
  //         id: processingToastId,
  //       });

  //       try {
  //         const response = await fetch(videoUrl);
  //         const blob = await response.blob();
  //         zip.file(filename, blob);
  //       } catch (error) {
  //         console.error(`Error processing video ${i + 1}:`, error);
  //         toast.error(`Failed to process video ${i + 1}`, { duration: 2000 });
  //       }
  //     }

  //     toast.loading("Generating zip file...", {
  //       id: processingToastId,
  //     });

  //     const zipBlob = await zip.generateAsync({ type: "blob" });

  //     toast.loading("Starting download...", {
  //       id: processingToastId,
  //     });

  //     const url = URL.createObjectURL(zipBlob);
  //     const link = document.createElement("a");
  //     link.href = url;
  //     link.download = `${data.code.toLowerCase()}_videos.zip`;
  //     document.body.appendChild(link);
  //     link.click();
  //     document.body.removeChild(link);

  //     // Clean up
  //     URL.revokeObjectURL(url);

  //     toast.dismiss(processingToastId);
  //     toast.success("All videos downloaded successfully!");
  //   } catch (error) {
  //     console.error("Error downloading videos:", error);
  //     if (processingToastId) {
  //       toast.dismiss(processingToastId);
  //     }
  //     toast.error("Failed to download videos");
  //   } finally {
  //     setDownloading(false);
  //     setDownloadDialogOpen(false);
  //   }
  // };

  const downloadAllVideosDirectly = async () => {
    let processingToastId: string | number | undefined;

    try {
      setDownloading(true);

      processingToastId = toast.loading("Starting video download process...");

      // Filter for video files (assuming there's a videos array or video URLs in your data)
      // You'll need to adjust this based on your actual data structure
      const videoData = data.videos || []; // Adjust this based on your data structure

      if (videoData.length === 0) {
        toast.error("No videos found to download");
        setDownloading(false);
        setDownloadDialogOpen(false);
        return;
      }

      for (let i = 0; i < videoData.length; i++) {
        const videoUrl = videoData[i].url;
        const filename = `${data.code.toLowerCase()}_video_${i + 1}.mp4`;

        toast.loading(`Processing video ${i + 1}/${videoData.length}...`, {
          id: processingToastId,
        });

        try {
          const response = await fetch(videoUrl);
          const blob = await response.blob();

          // Create download link for individual video
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          // Clean up URL object
          URL.revokeObjectURL(url);

          // Small delay between downloads to prevent browser issues
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Error processing video ${i + 1}:`, error);
          toast.error(`Failed to process video ${i + 1}`, { duration: 2000 });
        }
      }

      toast.dismiss(processingToastId);
      toast.success("All videos downloaded successfully!");
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

  const handleDownloadClick = () => {
    const imgDom = document.querySelector(
      `#download${data.code}`
    ) as HTMLImageElement;
    console.log(imgDom?.complete, dimensions);

    if (dimensions.width !== 0 && dimensions.height !== 0) {
      setDownloadDialogOpen(true);
    } else {
      toast.error("Images not loaded yet");
    }
  };

  return (
    <div id="container" className="p-3 bg-slate-300">
      <div className="w-[2200px] h-[2200px]" hidden>
        <img
          id={`download${data.code}`}
          className="w-full h-full object-cover"
          src={data.images[0].url}
          crossOrigin="anonymous"
          width={dimensions.width}
          height={dimensions.height}
        ></img>
      </div>
      <img
        src={data.images[0].url}
        id={`${data.code}-visible`}
        alt=""
        crossOrigin="anonymous"
        loading="lazy"
        className="object-contain w-[250px] h-[250px]"
        width={dimensions.width}
        height={dimensions.height}
        style={{
          width: "300px",
          height: "300px",
        }}
      />

      <p
        key={"code"}
        className="font-bold"
      >{`Code: ${data.code?.toUpperCase()} (${data.images.length} Images)`}</p>
      <p
        key={"price"}
        className="text-base font-bold mt-2 mb-1"
      >{`Price - ${data.sellingPrice}/-`}</p>
      {data.isBigPrice && data.bigPrice && (
        <p
          key={"bigprice"}
          className="text-base text-[#1e40af] font-bold mb-1"
        >{`Big Size Price - ${parseFloat(data.bigPrice) + parseFloat(data.sellingPrice)}/-`}</p>
      )}
      <div className="flex flex-row space-evenely mb-2 gap-2">
        <Table className="border border-collapse border-red">
          <TableHeader className="border border-red text-white bg-slate-800">
            <TableHead className="font-bold border border-red text-white bg-slate-800">
              SIZE
            </TableHead>
            <TableHead className="font-bold border border-red text-white bg-slate-800">
              STOCK
            </TableHead>
          </TableHeader>
          <TableBody>
            {data.sizes.map((sz: any, i: number) => {
              if (i >= Math.ceil(sizes / 2) || sz.quantity === 0) {
                return "";
              }
              return (
                <TableRow key={i}>
                  <TableCell className="border border-red">
                    {sz.size?.toUpperCase()}
                  </TableCell>
                  <TableCell className="border border-red">
                    {sz.quantity}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <Table className="border border-collapse border-red">
          <TableHeader className="border border-red text-white bg-slate-800">
            <TableHead className="font-bold border border-red text-white bg-slate-800">
              SIZE
            </TableHead>
            <TableHead className="font-bold border border-red text-white bg-slate-800">
              STOCK
            </TableHead>
          </TableHeader>
          <TableBody>
            {data.sizes.map((sz: any, i: number) => {
              if (i < Math.ceil(sizes / 2) || sz.quantity === 0) {
                return "";
              }
              return (
                <TableRow key={i}>
                  <TableCell className="border border-red">
                    {sz.size?.toUpperCase()}
                  </TableCell>
                  <TableCell className="border border-red">
                    {sz.quantity}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-row space-evenely gap-3">
        {/* Download Options Dialog */}
        <Dialog open={downloadDialogOpen} onOpenChange={setDownloadDialogOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              onClick={handleDownloadClick}
              variant={"outline"}
              key={"download"}
              disabled={downloading}
            >
              {downloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Download
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Download Options</DialogTitle>
              <DialogDescription>
                Choose what you want to download for{" "}
                <span className="font-bold">{data.code?.toUpperCase()}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 py-4">
              {data.images?.length > 0 && (
                <Button
                  type="button"
                  onClick={downloadAllImagesDirectly}
                  variant="outline"
                  disabled={downloading}
                  className="flex items-center justify-center"
                >
                  {downloading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  📸 Download Images
                </Button>
              )}
              {data.videos?.length > 0 && (
                <Button
                  type="button"
                  onClick={downloadAllVideosDirectly}
                  variant="outline"
                  disabled={downloading}
                  className="flex items-center justify-center"
                >
                  {downloading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  🎥 Download Videos
                </Button>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDownloadDialogOpen(false)}
                disabled={downloading}
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <RoleGateForComponent allowedRole={[UserRole.ADMIN, UserRole.UPLOADER]}>
          <Link
            href={
              pathname.split("/").length !== 2
                ? `${pathname}/${data.code.toLowerCase()}`
                : `${pathname}/${data.category.toLowerCase()}/${data.code.toLowerCase()}`
            }
            className="mt-0 pt-0 mr-3"
          >
            <Button
              type="button"
              className="ml-3"
              variant={"outline"}
              key={"edit"}
            >
              ✏️
            </Button>
          </Link>
          <Button className="mt-0" asChild>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant={"destructive"}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    x="0px"
                    y="0px"
                    width="25"
                    height="25"
                    viewBox="0 0 30 30"
                    style={{
                      fill: "#ffffff",
                    }}
                  >
                    <path d="M 14.984375 2.4863281 A 1.0001 1.0001 0 0 0 14 3.5 L 14 4 L 8.5 4 A 1.0001 1.0001 0 0 0 7.4863281 5 L 6 5 A 1.0001 1.0001 0 1 0 6 7 L 24 7 A 1.0001 1.0001 0 1 0 24 5 L 22.513672 5 A 1.0001 1.0001 0 0 0 21.5 4 L 16 4 L 16 3.5 A 1.0001 1.0001 0 0 0 14.984375 2.4863281 z M 6 9 L 7.7929688 24.234375 C 7.9109687 25.241375 8.7633438 26 9.7773438 26 L 20.222656 26 C 21.236656 26 22.088031 25.241375 22.207031 24.234375 L 24 9 L 6 9 z"></path>
                  </svg>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Delete Kurti</DialogTitle>
                  <DialogDescription>
                    Delete the kurti{" "}
                    <span className="font-bold">{data.code}</span>
                  </DialogDescription>
                </DialogHeader>
                <Button
                  type={"button"}
                  variant={"destructive"}
                  onClick={handleDelete}
                >
                  Delete
                </Button>
              </DialogContent>
            </Dialog>
          </Button>
        </RoleGateForComponent>
      </div>
    </div>
  );
};

export default KurtiPicCard;
