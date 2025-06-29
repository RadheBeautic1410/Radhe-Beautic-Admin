"use client";

import React, { useRef, useState } from "react";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { UploadCloud } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/src/components/ui/command";
import { DialogDemo } from "@/src/components/dialog-demo";
import { Label } from "@/src/components/ui/label";
import { Input } from "@/src/components/ui/input";
import ImageUpload2, {
  ImageUploadRef,
} from "../_components/upload/imageUpload2";
import { Party } from "@prisma/client";
type Category = {
  id: string;
  name: string;
  normalizedLowerCase: string;
  type: string;
};

const NewUploadPage = () => {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [isPending, setIsPending] = React.useState(false); // Added to fix error
  const [parties, setParties] = React.useState<Party[]>([]);
  const [selectedParty, setSelectedParty] = React.useState("");
  const [openParty, setOpenParty] = React.useState(false);
  const imageUploadRef = useRef<ImageUploadRef>(null);
  const [images, setImages] = useState<any[]>([]);
  React.useEffect(() => {
    const fetchParties = async () => {
      try {
        const res = await fetch("/api/party");
        const json = await res.json();

        if (Array.isArray(json.data)) {
          const normalizedParties = json.data.map((p: any) => ({
            ...p,
            normalizedLowerCase: p.name?.toLowerCase().replace(/\s+/g, ""),
          }));
          setParties(normalizedParties);
        } else {
          setParties([]);
        }
      } catch (err) {
        console.error("Failed to fetch parties", err);
        setParties([]);
      }
    };

    fetchParties();
  }, []);


  React.useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/category");
        const json = await res.json();

        if (Array.isArray(json.data)) {
          const normalizedData = json.data.map((cat: Category) => ({
            ...cat,
            normalizedLowerCase: cat.name?.toLowerCase().replace(/\s+/g, ""),
          }));
          setCategories(normalizedData);
        } else {
          console.error("Invalid categories format:", json);
          setCategories([]);
        }
      } catch (err) {
        console.error("Failed to load categories", err);
        setCategories([]);
      }
    };

    fetchCategories();
  }, []);

  const formCategory = {
    handleSubmit: (fn: () => void) => () => fn(),
  };

  const handleSubmitCategory = () => {
    // Implement category submission logic here
    alert("Category submitted!");
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mt-10 shadow-xl rounded-2xl">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">New Product Upload</CardTitle>
        <CardDescription>
          Upload image and select or create a category.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <ImageUpload2
          ref={imageUploadRef}
          images={images}
          onImageChange={setImages}
        />
       
        {/* Category Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium mb-1">Category</label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                >
                  {value
                    ? categories.find(
                      (category) => category.normalizedLowerCase === value
                    )?.name ?? "Select category"
                    : "Select category"}
                  <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-[--radix-popover-trigger-width] p-0 max-h-60 overflow-y-auto"
              >
                <Command>
                  <CommandInput placeholder="Search category..." />
                  <CommandEmpty>No category found.</CommandEmpty>
                  <CommandGroup>
                    <CommandList>
                      {categories.map((category, index) => (
                        <CommandItem
                          key={index}
                          value={category.name}
                          onSelect={(currentValue) => {
                            const selected = categories.find(
                              (c) => c.name === currentValue
                            );
                            if (selected) {
                              setValue(selected.normalizedLowerCase);
                            }
                            setOpen(false);
                          }}
                          className="flex items-center px-3 py-2 text-sm cursor-pointer hover:bg-muted"
                        >
                          <CheckIcon
                            className={`mr-2 h-4 w-4 ${value === category.normalizedLowerCase
                              ? "opacity-100"
                              : "opacity-0"
                              }`}
                          />
                          <span className="truncate">{category.name}</span>
                        </CommandItem>
                      ))}
                    </CommandList>
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <DialogDemo
            dialogTrigger="Add Category"
            dialogTitle="Add New Category"
            dialogDescription="Fill out the form to add a new category."
          >
            {(closeDialog) => (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const name = formData.get("name")?.toString().trim();
                  const type = formData.get("type")?.toString().trim();

                  if (!name) return alert("Category name is required");

                  try {
                    setIsPending(true);
                    const res = await fetch("/api/category/add", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ name, type }),
                    });

                    const json = await res.json();

                    if (!res.ok)
                      throw new Error(json.error || "Failed to add category");

                    alert("Category added!");

                    // Refresh categories
                    const updated = await fetch("/api/category");
                    const { data } = await updated.json();
                    setCategories(data || []);

                    closeDialog(); // ✅ close the dialog after success
                  } catch (err: any) {
                    alert(err.message);
                  } finally {
                    setIsPending(false);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label
                    htmlFor="name"
                    className="text-sm font-medium block mb-1"
                  >
                    Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="e.g. Chocolate"
                    className="w-full border px-3 py-2 rounded-md"
                  />
                </div>
                <div>
                  <label
                    htmlFor="type"
                    className="text-sm font-medium block mb-1"
                  >
                    Type
                  </label>
                  <input
                    id="type"
                    name="type"
                    type="text"
                    placeholder="e.g. Food"
                    className="w-full border px-3 py-2 rounded-md"
                  />
                </div>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Adding..." : "Add Category"}
                </Button>
              </form>
            )}
          </DialogDemo>
        </div>

        {/* Party Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium mb-1">Party</label>
            <Popover open={openParty} onOpenChange={setOpenParty}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openParty}
                  className="w-full justify-between"
                >
                  {selectedParty
                    ? parties.find(
                      (p) => p.normalizedLowerCase === selectedParty
                    )?.name
                    : "Select party"}
                  <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0 max-h-60 overflow-y-auto">
                <Command>
                  <CommandInput placeholder="Search party..." />
                  <CommandEmpty>No party found.</CommandEmpty>
                  <CommandGroup>
                    <CommandList>
                      {parties.map((party, i) => (
                        <CommandItem
                          key={i}
                          value={party.name}
                          onSelect={(currentValue) => {
                            const selected = parties.find(
                              (p) => p.name === currentValue
                            );
                            if (selected) {
                              setSelectedParty(selected.normalizedLowerCase);
                            }
                            setOpenParty(false);
                          }}
                          className="flex items-center px-3 py-2 text-sm cursor-pointer hover:bg-muted"
                        >
                          <CheckIcon
                            className={`mr-2 h-4 w-4 ${selectedParty === party.normalizedLowerCase
                              ? "opacity-100"
                              : "opacity-0"
                              }`}
                          />
                          <span className="truncate">{party.name}</span>
                        </CommandItem>
                      ))}
                    </CommandList>
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <DialogDemo
            dialogTrigger="Add Party"
            dialogTitle="Add New Party"
            dialogDescription="Fill out the form to add a new party."
          >
            {(closeDialog) => (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const name = formData.get("name")?.toString().trim();
                  const type = formData.get("type")?.toString().trim();

                  if (!name) return alert("Party name is required");

                  try {
                    setIsPending(true);
                    const res = await fetch("/api/party/add", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ name, type }),
                    });

                    const json = await res.json();

                    if (!res.ok)
                      throw new Error(json.error || "Failed to add party");

                    alert("Party added!");

                    // Refresh party list
                    const updated = await fetch("/api/party");
                    const { data } = await updated.json();
                    setParties(data || []);

                    closeDialog();
                  } catch (err: any) {
                    alert(err.message);
                  } finally {
                    setIsPending(false);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label htmlFor="name" className="text-sm font-medium block mb-1">
                    Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="e.g. Distributor A"
                    className="w-full border px-3 py-2 rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="type" className="text-sm font-medium block mb-1">
                    Type
                  </label>
                  <input
                    id="type"
                    name="type"
                    type="text"
                    placeholder="e.g. Retail"
                    className="w-full border px-3 py-2 rounded-md"
                  />
                </div>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Adding..." : "Add Party"}
                </Button>
              </form>
            )}
          </DialogDemo>
        </div>
      </CardContent>

    </Card >
  );
};

export default NewUploadPage;
