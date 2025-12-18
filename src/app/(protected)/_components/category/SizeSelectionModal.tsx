"use client";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { fetchKurtiByCategory } from "@/src/actions/kurti";
import { HashLoader } from "react-spinners";
import { toast } from "sonner";
import JSZip from "jszip";
import { Check } from "lucide-react";

interface SizeSelectionModalProps {
  categoryName: string;
  trigger: React.ReactElement;
  onDownload?: () => void;
}

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

export const SizeSelectionModal = ({
  categoryName,
  trigger,
  onDownload,
}: SizeSelectionModalProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sizes, setSizes] = useState<Set<string>>(new Set());
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchAvailableSizes();
    }
  }, [open, categoryName]);

  const fetchAvailableSizes = async () => {
    setLoading(true);
    try {
      const kurtiData = await fetchKurtiByCategory(categoryName);
      const categoryKurtis = kurtiData.data.filter((kurti: any) => {
        const matchesCategory =
          kurti.category?.toLowerCase() === categoryName.toLowerCase();
        const notDeleted = !kurti.isDeleted;
        const hasAvailableSizes =
          kurti.sizes &&
          Array.isArray(kurti.sizes) &&
          kurti.sizes.length > 0 &&
          kurti.sizes.some((size: any) => size.quantity > 0);
        return matchesCategory && notDeleted && hasAvailableSizes;
      });

      // Extract all unique sizes from all kurtis
      const uniqueSizes = new Set<string>();
      categoryKurtis.forEach((kurti: any) => {
        if (kurti.sizes && Array.isArray(kurti.sizes)) {
          kurti.sizes.forEach((size: any) => {
            if (size && size.quantity > 0 && size.size) {
              uniqueSizes.add(size.size.toUpperCase());
            }
          });
        }
      });

      // Sort sizes according to SIZE_ORDER
      const sortedSizes = Array.from(uniqueSizes).sort(
        (a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b)
      );

      setAvailableSizes(sortedSizes);
    } catch (error) {
      console.error("Error fetching sizes:", error);
      toast.error("Failed to fetch available sizes");
    } finally {
      setLoading(false);
    }
  };

  const toggleSize = (size: string) => {
    const newSizes = new Set(sizes);
    if (newSizes.has(size)) {
      newSizes.delete(size);
    } else {
      newSizes.add(size);
    }
    setSizes(newSizes);
  };

  const handleDownload = async () => {
    if (sizes.size === 0) {
      toast.error("Please select at least one size");
      return;
    }

    setDownloading(true);
    const loadingToast = toast.loading("Preparing download...");

    try {
      const kurtiData = await fetchKurtiByCategory(categoryName);
      const categoryKurtis = kurtiData.data.filter((kurti: any) => {
        const matchesCategory =
          kurti.category?.toLowerCase() === categoryName.toLowerCase();
        const notDeleted = !kurti.isDeleted;
        const selectedSizesArr = Array.from(sizes);

        // Check if kurti has any of the selected sizes
        // const hasSelectedSizes =
        //   kurti.sizes &&
        //   Array.isArray(kurti.sizes) &&
        //   kurti.sizes.every(
        //     (size: any) =>
        //       size &&
        //       size.quantity > 0 &&
        //       size.size &&
        //       sizes.has(size.size.toUpperCase())
        //   );
        const hasSelectedSizes =
          kurti.sizes &&
          Array.isArray(kurti.sizes) &&
          selectedSizesArr.every((selectedSize) =>
            kurti.sizes.some(
              (s: any) =>
                s.size?.toUpperCase() === selectedSize && s.quantity > 0
            )
          );

        return matchesCategory && notDeleted && hasSelectedSizes;
      });

      if (categoryKurtis.length === 0) {
        toast.error("No kurtis found with selected sizes");
        return;
      }

      const mediaUrls: any[] = [];

      // Collect all images from kurtis that have selected sizes
      for (const kurti of categoryKurtis) {
        // Check if this kurti has any of the selected sizes
        const kurtiSizes =
          kurti.sizes && Array.isArray(kurti.sizes)
            ? kurti.sizes
                .filter(
                  (size: any) =>
                    size &&
                    size.quantity > 0 &&
                    size.size &&
                    sizes.has(size.size.toUpperCase())
                )
                .map((s: any) => s.size.toUpperCase())
            : [];

        if (kurtiSizes && kurtiSizes.length > 0) {
          // Add images (no watermark)
          if (kurti.images && Array.isArray(kurti.images)) {
            kurti.images.forEach((imageObj: any) => {
              if (imageObj.url && !imageObj.is_hidden) {
                mediaUrls.push({
                  url: imageObj.url,
                  filename: `${kurti.code}_image_${imageObj.id}.jpg`,
                  kurtiCode: kurti.code,
                  type: "image",
                });
              }
            });
          }

          // Add videos
          if (kurti.videos && Array.isArray(kurti.videos)) {
            kurti.videos.forEach((videoObj: any) => {
              if (videoObj.url && !videoObj.is_hidden) {
                const getVideoExtension = (url: string): string => {
                  try {
                    const urlWithoutParams = url.split("?")[0];
                    const parts = urlWithoutParams.split(".");
                    if (parts.length > 1) {
                      const ext = parts.pop()?.toLowerCase();
                      const validExtensions = [
                        "mp4",
                        "avi",
                        "mov",
                        "mkv",
                        "wmv",
                        "flv",
                        "webm",
                        "m4v",
                      ];
                      if (ext && validExtensions.includes(ext)) {
                        return ext;
                      }
                    }
                    return "mp4";
                  } catch (error) {
                    return "mp4";
                  }
                };

                const extension = getVideoExtension(videoObj.url);
                mediaUrls.push({
                  url: videoObj.url,
                  filename: `${kurti.code}_video_${videoObj.id}.${extension}`,
                  kurtiCode: kurti.code,
                  type: "video",
                });
              }
            });
          }
        }
      }

      if (mediaUrls.length === 0) {
        toast.error("No media files found for selected sizes");
        return;
      }

      toast.loading(`Processing ${mediaUrls.length} files...`, {
        id: loadingToast,
      });

      const zip = new JSZip();

      const downloadPromises = mediaUrls.map(
        async (mediaInfo: any, index: number) => {
          try {
            toast.loading(
              `Processing ${mediaInfo.type} ${index + 1}/${
                mediaUrls.length
              }...`,
              {
                id: loadingToast,
              }
            );

            // Download directly without watermark
            const response = await fetch(mediaInfo.url);
            if (!response.ok) {
              console.warn(`Failed to download file: ${mediaInfo.url}`);
              return null;
            }

            const blob = await response.blob();
            zip.file(mediaInfo.filename, blob);
            return true;
          } catch (error) {
            console.error(
              `Error processing ${mediaInfo.type} ${mediaInfo.url}:`,
              error
            );
            return null;
          }
        }
      );

      const results = await Promise.all(downloadPromises);
      const successCount = results.filter((result) => result !== null).length;

      if (successCount === 0) {
        toast.dismiss(loadingToast);
        toast.error("Failed to process any files");
        return;
      }

      toast.loading("Generating zip file...", {
        id: loadingToast,
      });

      const zipBlob = await zip.generateAsync({ type: "blob" });

      toast.loading("Starting download...", {
        id: loadingToast,
      });

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      const selectedSizesStr = Array.from(sizes).sort().join("_");
      a.download = `${categoryName}_${selectedSizesStr}_${
        new Date().toISOString().split("T")[0]
      }.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.dismiss(loadingToast);
      toast.success(
        `Downloaded ${successCount} files successfully (no watermarks)!`
      );

      setOpen(false);
      setSizes(new Set());
      if (onDownload) {
        onDownload();
      }
    } catch (error) {
      console.error("Error creating zip file:", error);
      toast.error("Failed to create zip file");
    } finally {
      setDownloading(false);
      toast.dismiss(loadingToast);
    }
  };
  const generateLink = async () => {
    const selectedSizesArr = Array.from(sizes);
    const Createlink = `http://www.radhebeautic.com//sharebyadmin/${categoryName}/${selectedSizesArr[0]}`;
    // want to clipboard this createlink

    try {
      await navigator.clipboard.writeText(Createlink);
      toast.success("Link copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy link to clipboard:", error);
      toast.error("Failed to copy link to clipboard");
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Sizes - {categoryName}</DialogTitle>
          <DialogDescription>
            Select the sizes you want to download images for. Images will be
            downloaded without watermarks.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <HashLoader color="black" loading={loading} size={40} />
          </div>
        ) : (
          <div className="space-y-4">
            {availableSizes.length === 0 ? (
              <p className="text-center text-gray-500 py-4">
                No available sizes found for this category
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">
                    Available Sizes ({availableSizes.length})
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSizes(new Set(availableSizes))}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSizes(new Set())}
                    >
                      Clear All
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[300px] overflow-y-auto p-2 border rounded-md">
                  {availableSizes.map((size) => {
                    const isChecked = sizes.has(size);
                    return (
                      <div
                        key={size}
                        className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-2 rounded"
                        onClick={() => toggleSize(size)}
                      >
                        <div
                          className={`h-4 w-4 border-2 rounded flex items-center justify-center ${
                            isChecked
                              ? "bg-primary border-primary"
                              : "border-gray-300"
                          }`}
                        >
                          {isChecked && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>
                        <label className="text-sm font-medium cursor-pointer">
                          {size}
                        </label>
                      </div>
                    );
                  })}
                </div>
                <p className="text-sm text-gray-600">
                  Selected: {sizes.size} size{sizes.size !== 1 ? "s" : ""}
                </p>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleDownload}
            disabled={downloading || sizes.size === 0 || loading}
          >
            {downloading ? "Downloading..." : "Download Selected Sizes"}
          </Button>
          <Button onClick={generateLink}>{"Generate link"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
