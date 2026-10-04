"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { Skeleton } from "@/src/components/ui/skeleton";
import Link from "next/link";
import { useEffect, useState } from "react";
import JSZip from "jszip";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface FullSetKurti {
  code: string;
  category: string;
  image: string | null;
  images: string[];
  sizes: { size: string; quantity: number }[];
}

/** File extension for a downloaded image, from its type or URL. */
const imageExtension = (blob: Blob, url: string) => {
  const fromType = blob.type.split("/")[1]?.replace("jpeg", "jpg");
  if (fromType && /^[a-z0-9]+$/.test(fromType)) return fromType;
  const fromUrl = url.split("?")[0].split(".").pop()?.toLowerCase();
  return fromUrl && fromUrl.length <= 4 ? fromUrl : "jpg";
};

/** Run `task` over `items` with at most `limit` running at once. */
const runLimited = async <T,>(items: T[], limit: number, task: (item: T) => Promise<void>) => {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) await task(items[next++]);
    })
  );
};

interface FullSetModalProps {
  trigger: React.ReactElement;
  /** Omit to list full-set designs across every category. */
  categoryName?: string;
  /** Count already shown on the page, used before the fetch resolves. */
  count?: number;
}

const PAGE_SIZE = 60;
const SIZE_ORDER = ["M", "L", "XL", "XXL"];

export const FullSetModal = ({
  trigger,
  categoryName,
  count,
}: FullSetModalProps) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<FullSetKurti[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = async (nextPage: number, replace: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: String(PAGE_SIZE),
      });
      if (categoryName) params.set("category", categoryName);

      const res = await fetch(`/api/category/full-set?${params}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (json?.error) throw new Error(json.error);

      const rows: FullSetKurti[] = json?.data ?? [];
      setItems((prev) => (replace ? rows : [...prev, ...rows]));
      setTotal(json?.pagination?.total ?? 0);
      setPage(nextPage);
    } catch (err: any) {
      setError(err?.message || "Failed to load full set designs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setItems([]);
    setTotal(0);
    setPage(1);
    fetchPage(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, categoryName]);

  const hasMore = items.length < total;
  const shownTotal = total || count || 0;
  const [downloading, setDownloading] = useState(false);

  /**
   * Zip every visible image of every full-set design (not only the loaded page),
   * without a watermark. Across all categories, each category gets a folder.
   */
  const downloadImages = async () => {
    const toastId = toast.loading("Collecting full set designs...");
    setDownloading(true);
    try {
      const all: FullSetKurti[] = [];
      for (let p = 1; ; p++) {
        const params = new URLSearchParams({ page: String(p), limit: "100" });
        if (categoryName) params.set("category", categoryName);
        const res = await fetch(`/api/category/full-set?${params}`, { cache: "no-store" });
        const json = await res.json();
        if (json?.error) throw new Error(json.error);
        all.push(...(json?.data ?? []));
        if (p >= (json?.pagination?.totalPages ?? 1)) break;
      }

      const files = all.flatMap((k) =>
        (k.images || []).map((url, i) => ({
          url,
          name: `${categoryName ? "" : `${k.category}/`}${k.code}_${i + 1}`,
        }))
      );
      if (!files.length) {
        toast.error("No images found for these designs", { id: toastId });
        return;
      }

      const zip = new JSZip();
      let done = 0;
      let failed = 0;
      await runLimited(files, 6, async (file) => {
        try {
          const res = await fetch(file.url);
          if (!res.ok) throw new Error(String(res.status));
          const blob = await res.blob();
          zip.file(`${file.name}.${imageExtension(blob, file.url)}`, blob);
        } catch (e) {
          console.warn("Full set image failed:", file.url, e);
          failed++;
        }
        done++;
        toast.loading(`Downloading images ${done}/${files.length}...`, { id: toastId });
      });

      if (failed === files.length) {
        toast.error("Could not download any image", { id: toastId });
        return;
      }

      toast.loading("Creating zip file...", { id: toastId });
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${categoryName || "all_categories"}_full_set_${
        new Date().toISOString().split("T")[0]
      }.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(
        `Downloaded ${files.length - failed} image(s) of ${all.length} design(s)` +
          (failed ? ` - ${failed} image(s) failed` : ""),
        { id: toastId }
      );
    } catch (e: any) {
      toast.error(e?.message || "Download failed", { id: toastId });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {categoryName ? `${categoryName} - Full Set Designs` : "Full Set Designs"}
          </DialogTitle>
          <DialogDescription>
            Designs having stock in all of M, L, XL and XXL
            {shownTotal ? ` - ${shownTotal} design${shownTotal === 1 ? "" : "s"}` : ""}
          </DialogDescription>
          <div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={downloading || shownTotal === 0}
              onClick={downloadImages}
            >
              {downloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Download images (zip)
            </Button>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto pr-1 -mr-1">
          {loading && items.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div key={idx} className="border rounded-xl overflow-hidden">
                  <Skeleton className="h-40 w-full bg-gray-200 animate-pulse" />
                  <div className="p-2 space-y-2">
                    <Skeleton className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                    <Skeleton className="h-3 w-28 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm text-red-600">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchPage(1, true)}
              >
                Try again
              </Button>
            </div>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">
              No full set designs found.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {items.map((item) => (
                  <Link
                    key={`${item.category}-${item.code}`}
                    href={`/catalogue/${item.category.toLowerCase()}/${item.code.toLowerCase()}`}
                    className="border rounded-xl overflow-hidden bg-white hover:shadow-md transition-shadow"
                  >
                    <img
                      src={item.image || "/images/no-image.png"}
                      alt={item.code}
                      className="h-40 w-full object-cover bg-gray-100"
                    />
                    <div className="p-2 space-y-1">
                      <p className="font-bold text-sm text-blue-800">
                        {item.code}
                      </p>
                      {!categoryName && (
                        <p className="text-xs text-gray-500">{item.category}</p>
                      )}
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {[...item.sizes]
                          .sort(
                            (a, b) =>
                              SIZE_ORDER.indexOf(a.size) -
                              SIZE_ORDER.indexOf(b.size)
                          )
                          .map((size) => (
                            <span
                              key={size.size}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200"
                            >
                              {size.size}: {size.quantity}
                            </span>
                          ))}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => fetchPage(page + 1, false)}
                  >
                    {loading
                      ? "Loading..."
                      : `Load more (${items.length} of ${total})`}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FullSetModal;
