import { Search, X, Camera, Loader2, Sparkles } from "lucide-react";
import { Input } from "./ui/input";
import { cn } from "./ui/command";
import { Button } from "./ui/button";
import { useRef } from "react";

export function SearchBar({
  value,
  onChange,
  onCancelResearch,
  onImageSearch,
  isImageLoading = false,
  isSemanticSearch = false,
  onToggleSemanticSearch,
  isTextSearchLoading = false,
  placeholder = "Search...",
  className,
  ...props
}: {
  value: string;
  onChange: (value: string) => void;
  onCancelResearch: () => void;
  onImageSearch?: (base64Image: string) => void;
  isImageLoading?: boolean;
  isSemanticSearch?: boolean;
  onToggleSemanticSearch?: () => void;
  isTextSearchLoading?: boolean;
  placeholder?: string;
  className?: string;
  [key: string]: any;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const MAX_DIMENSION = 1600;

  // Mobile camera photos can be several MB at 3000px+; downscale before
  // upload so the search feels responsive. Orientation is corrected
  // server-side (more reliable than browser EXIF handling), so this is a
  // pure resize/compress step.
  const downscaleImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Failed to load image"));
      };
      img.src = objectUrl;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageSearch) {
      try {
        const dataUrl = await downscaleImage(file);
        onImageSearch(dataUrl);
      } catch {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            onImageSearch(reader.result);
          }
        };
        reader.readAsDataURL(file);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const effectivePlaceholder = isSemanticSearch
    ? "Describe what you're looking for... (e.g. red floral kurti)"
    : placeholder;

  return (
    <div className={cn("relative w-full", className)} {...props}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
      <Input
        type="text"
        placeholder={effectivePlaceholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 pr-28"
      />

      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
        {onToggleSemanticSearch && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onToggleSemanticSearch}
            className={cn(
              "h-7 w-7 p-0 hover:bg-muted",
              isSemanticSearch && "bg-muted text-primary"
            )}
            title={
              isSemanticSearch
                ? "Semantic search on — click to search by exact name/code again"
                : "Search by description"
            }
          >
            <Sparkles className="h-4 w-4" />
          </Button>
        )}

        {isTextSearchLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}

        {isImageLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-1.5" />
        ) : (
          onImageSearch && !value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCameraClick}
              className="h-7 w-7 p-0 hover:bg-muted"
              title="Search by image"
            >
              <Camera className="h-4 w-4 text-muted-foreground" />
            </Button>
          )
        )}

        {value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancelResearch}
            className="h-6 w-6 p-0 hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
