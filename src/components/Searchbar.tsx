import { Search, X } from "lucide-react";
import { Input } from "./ui/input";
import { cn } from "./ui/command";
import { Button } from "./ui/button";

export function SearchBar({
  value,
  onChange,
  onCancelResearch,
  placeholder = "Search...",
  className,
  ...props
}: {
  value: string;
  onChange: (value: string) => void;
  onCancelResearch: () => void;
  placeholder?: string;
  className?: string;
  [key: string]: any;
}) {
  return (
    <div className={cn("relative w-full", className)} {...props}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 pr-10"
      />
      {value && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancelResearch}
          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
