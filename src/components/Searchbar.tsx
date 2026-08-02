import { Search, X, Camera, Loader2 } from "lucide-react";
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
  placeholder = "Search...",
  className,
  ...props
}: {
  value: string;
  onChange: (value: string) => void;
  onCancelResearch: () => void;
  onImageSearch?: (base64Image: string) => void;
  isImageLoading?: boolean;
  placeholder?: string;
  className?: string;
  [key: string]: any;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageSearch) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          onImageSearch(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className={cn("relative w-full", className)} {...props}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 pr-20"
      />
      
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
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
