"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, Plus, X } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/src/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/src/components/ui/popover"

/**
 * Searchable dropdown that also accepts a value not in `options`: typing a new
 * name offers "<createLabel> "name"".
 */
export function CreatableCombobox({
  id,
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder = "Search...",
  createLabel = "Use",
  ariaLabel,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  options: readonly string[]
  placeholder: string
  searchPlaceholder?: string
  createLabel?: string
  ariaLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const typed = search.trim()
  const exists = options.some((o) => o.toLowerCase() === typed.toLowerCase())

  const pick = (v: string) => {
    onChange(v)
    setOpen(false)
    setSearch("")
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setSearch("")
      }}
    >
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          className="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-left text-sm ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <span className={`truncate ${value ? "text-gray-900" : "text-muted-foreground"}`}>{value || placeholder}</span>
          <span className="flex shrink-0 items-center gap-1 text-gray-400">
            {value && (
              <span
                role="button"
                tabIndex={-1}
                aria-label="Clear"
                className="rounded p-0.5 hover:bg-gray-100 hover:text-gray-700"
                onPointerDown={(e) => {
                  // Clear without opening the dropdown.
                  e.preventDefault()
                  e.stopPropagation()
                  onChange("")
                }}
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4" />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="!w-[var(--radix-popover-trigger-width)] min-w-[14rem] !p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} value={search} onValueChange={setSearch} />
          <CommandList className="max-h-64">
            {!typed && <CommandEmpty>Nothing to choose yet. Type a name.</CommandEmpty>}
            <CommandGroup>
              {options.map((o) => (
                <CommandItem key={o} value={o} onSelect={() => pick(o)}>
                  <Check className={`h-4 w-4 ${value === o ? "opacity-100" : "opacity-0"}`} />
                  <span className="truncate">{o}</span>
                </CommandItem>
              ))}
              {typed && !exists && (
                <CommandItem forceMount value={`__create__${typed}`} onSelect={() => pick(typed)} className="text-pink-700">
                  <Plus className="h-4 w-4" />
                  <span className="truncate">
                    {createLabel} &ldquo;{typed}&rdquo;
                  </span>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
