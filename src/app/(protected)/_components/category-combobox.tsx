"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/src/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/src/components/ui/command";
import { cn } from "@/src/lib/utils";

interface CategoryComboboxProps {
  id?: string;
  categories: string[];
  value: string;
  onChange: (category: string) => void;
  placeholder?: string;
}

/** Searchable, A-Z sorted category picker - replaces a long native <select>. */
export const CategoryCombobox = ({
  id,
  categories,
  value,
  onChange,
  placeholder = "Select Category",
}: CategoryComboboxProps) => {
  const [open, setOpen] = useState(false);
  const sorted = useMemo(
    () =>
      Array.from(new Set(categories)).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
      ),
    [categories]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          className="w-full h-10 px-3 border rounded-md bg-white flex items-center justify-between text-sm"
        >
          <span className={cn("truncate", !value && "text-gray-500")}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search category..." />
          <CommandList className="max-h-[240px]">
            <CommandEmpty>No category found.</CommandEmpty>
            <CommandGroup>
              {sorted.map((category) => (
                <CommandItem
                  key={category}
                  value={category}
                  onSelect={() => {
                    onChange(category);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === category ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {category}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
