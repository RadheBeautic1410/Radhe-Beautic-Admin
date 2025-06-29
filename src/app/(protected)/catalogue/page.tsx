"use client";

import { RoleGateForComponent } from "@/src/components/auth/role-gate-component";
import PageLoader from "@/src/components/loader";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { UserRole } from "@prisma/client";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { Button } from "@/src/components/ui/button";
import { DialogDemo } from "@/src/components/dialog-demo";
import { deleteCategory } from "@/src/actions/kurti";
import { toast } from "sonner";
// import SearchBar from "@mkyy/mui-search-bar";
import KurtiPicCard from "../_components/kurti/kurtiPicCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/src/components/ui/pagination";
import TypeEdit from "../_components/kurti/typeEdit";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/src/components/ui/form";
import { Input } from "@/src/components/ui/input";
import { categoryAddSchema } from "@/src/schemas";
import { categoryAddition } from "@/src/actions/category";
import { z } from "zod";
import ImageUpload2 from "../_components/upload/imageUpload2";
import EditCategoryModal from "../_components/category/EditCategoryModel";
import { SearchBar } from "@/src/components/Searchbar";

// Types
interface Category {
  name: string;
  count: number;
  type: string;
  countOfPiece: number;
  sellingPrice: number;
  actualPrice: number;
  image?: string;
}

interface Kurti {
  id: string;
  category: string;
  code: string;
  images: any[];
  sizes: any[];
  party: string;
  sellingPrice: string;
  actualPrice: string;
  isDeleted: boolean;
}

// Constants
const SEARCH_TYPES = {
  DESIGN: "0",
  CATEGORY: "1",
  PRICE: "2",
  TYPE: "3",
} as const;

const SORT_TYPES = {
  PRICE_HIGH_TO_LOW: "0",
  NAME: "1",
  PIECE_COUNT: "2",
  PRICE_LOW_TO_HIGH: "3",
} as const;

// Pagination constants
const ITEMS_PER_PAGE = 20;
const KURTI_ITEMS_PER_PAGE = 12;

type SearchTypeValue = (typeof SEARCH_TYPES)[keyof typeof SEARCH_TYPES];

// Utility functions
const getCurrTime = () => {
  const currentTime = new Date();
  const ISTOffset = 5.5 * 60 * 60 * 1000;
  return new Date(currentTime.getTime() + ISTOffset);
};

const calculateCategoryStats = (kurtiData: Kurti[], categories: Category[]) => {
  const categoryMap = new Map(
    categories.map((cat) => [
      cat.name.toLowerCase(),
      {
        ...cat,
        count: 0,
        countOfPiece: 0,
        sellingPrice: 0,
        actualPrice: 0,
      },
    ])
  );

  let totalItems = 0;
  let totalPieces = 0;
  let totalStockPrice = 0;

  kurtiData.forEach((kurti) => {
    if (kurti.isDeleted) return;

    const category = categoryMap.get(kurti.category.toLowerCase());
    if (!category) return;

    category.count += 1;
    totalItems += 1;

    const pieceCount = kurti.sizes.reduce(
      (sum, size) => sum + (size.quantity || 0),
      0
    );
    category.countOfPiece += pieceCount;
    totalPieces += pieceCount;

    if (category.sellingPrice === 0) {
      category.sellingPrice = parseInt(kurti.sellingPrice || "0");
    }

    const itemStockValue = pieceCount * parseInt(kurti.actualPrice || "0");
    category.actualPrice += itemStockValue;
    totalStockPrice += itemStockValue;
  });

  return {
    categories: Array.from(categoryMap.values()),
    totals: { totalItems, totalPieces, totalStockPrice },
  };
};

const sortCategories = (
  categories: Category[],
  sortType: string
): Category[] => {
  switch (sortType) {
    case SORT_TYPES.PRICE_HIGH_TO_LOW:
      return [...categories].sort((a, b) => b.sellingPrice - a.sellingPrice);
    case SORT_TYPES.PRICE_LOW_TO_HIGH:
      return [...categories].sort((a, b) => a.sellingPrice - b.sellingPrice);
    case SORT_TYPES.PIECE_COUNT:
      return [...categories].sort((a, b) => b.countOfPiece - a.countOfPiece);
    case SORT_TYPES.NAME:
      return [...categories].sort((a, b) => a.name.localeCompare(b.name));
    default:
      return categories;
  }
};

// Pagination utility functions
const paginate = <T,>(
  array: T[],
  pageNumber: number,
  pageSize: number
): T[] => {
  const startIndex = (pageNumber - 1) * pageSize;
  return array.slice(startIndex, startIndex + pageSize);
};

const getTotalPages = (totalItems: number, itemsPerPage: number): number => {
  return Math.ceil(totalItems / itemsPerPage);
};

const ListPage = () => {
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [kurtiData, setKurtiData] = useState<Kurti[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [searchType, setSearchType] = useState<SearchTypeValue>(
    SEARCH_TYPES.DESIGN
  );
  const [sortType, setSortType] = useState<string>(
    SORT_TYPES.PRICE_HIGH_TO_LOW
  );
  const [totals, setTotals] = useState({
    totalItems: 0,
    totalPieces: 0,
    totalStockPrice: 0,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [kurtiCurrentPage, setKurtiCurrentPage] = useState(1);

  const [isPending, startTransition] = useTransition();

  const form = useForm({
    defaultValues: {
      name: "",
      type: "",
      image: "",
    },
  });

  const fetchKurtiData = useCallback(async (): Promise<Kurti[]> => {
    try {
      const response = await fetch("/api/kurti/getall");
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error("Error fetching kurti data:", error);
      return [];
    }
  }, []);

  const fetchCategories = useCallback(async (): Promise<Category[]> => {
    try {
      const response = await fetch("/api/category");
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error("Error fetching categories:", error);
      return [];
    }
  }, []);

  const processedCategories = useMemo(() => {
    if (!categories.length || !kurtiData.length) return categories;

    const { categories: updatedCategories } = calculateCategoryStats(
      kurtiData,
      categories
    );
    return sortCategories(updatedCategories, sortType);
  }, [categories, kurtiData, sortType]);

  const { filteredKurti, filteredCategories } = useMemo(() => {
    if (!searchValue.trim()) {
      return {
        filteredKurti: searchType === SEARCH_TYPES.DESIGN ? kurtiData : [],
        filteredCategories:
          searchType !== SEARCH_TYPES.DESIGN ? processedCategories : [],
      };
    }

    const searchTerm = searchValue.toLowerCase();

    switch (searchType) {
      case SEARCH_TYPES.DESIGN:
        return {
          filteredKurti: kurtiData.filter((kurti) =>
            kurti.code.toLowerCase().includes(searchTerm)
          ),
          filteredCategories: [],
        };

      case SEARCH_TYPES.CATEGORY:
        return {
          filteredKurti: [],
          filteredCategories: processedCategories.filter((cat) =>
            cat.name.toLowerCase().includes(searchTerm)
          ),
        };

      case SEARCH_TYPES.PRICE:
        const priceSearch = parseInt(searchValue) || 0;
        return {
          filteredKurti: [],
          filteredCategories: processedCategories.filter(
            (cat) => cat.sellingPrice === priceSearch
          ),
        };

      case SEARCH_TYPES.TYPE:
        return {
          filteredKurti: [],
          filteredCategories: processedCategories.filter((cat) =>
            cat.type?.toLowerCase().includes(searchTerm)
          ),
        };

      default:
        return { filteredKurti: [], filteredCategories: processedCategories };
    }
  }, [searchValue, searchType, kurtiData, processedCategories]);

  const displayCategories = useMemo(() => {
    const categories =
      searchValue.trim().length > 0 ? filteredCategories : processedCategories;
    return paginate(categories, currentPage, ITEMS_PER_PAGE);
  }, [filteredCategories, processedCategories, currentPage, searchValue]);

  const displayKurti = useMemo(() => {
    return paginate(filteredKurti, kurtiCurrentPage, KURTI_ITEMS_PER_PAGE);
  }, [filteredKurti, kurtiCurrentPage]);

  const totalCategoryPages = useMemo(() => {
    const categories =
      searchValue.trim().length > 0 ? filteredCategories : processedCategories;
    return getTotalPages(categories.length, ITEMS_PER_PAGE);
  }, [filteredCategories, processedCategories, searchValue]);

  const totalKurtiPages = useMemo(() => {
    return getTotalPages(filteredKurti.length, KURTI_ITEMS_PER_PAGE);
  }, [filteredKurti]);

  const handleSearch = useCallback((newValue: string) => {
    setSearchValue(newValue);
    setCurrentPage(1);
    setKurtiCurrentPage(1);
  }, []);

  const handleSearchCancel = useCallback(() => {
    setSearchValue("");
    setCurrentPage(1);
    setKurtiCurrentPage(1);
  }, []);

  const handleSortChange = useCallback((newSortType: string) => {
    setSortType(newSortType);
    setCurrentPage(1);
  }, []);

  const handleDeleteCategory = useCallback(async (categoryName: string) => {
    startTransition(() => {
      deleteCategory({ category: categoryName })
        .then((data: any) => {
          if (data.error) {
            toast.error(data.error);
            return;
          }
          if (data.success) {
            toast.success(data.success);
            setIsLoading(true);
          }
        })
        .catch(() => {
          toast.error("Something went wrong!");
        });
    });
  }, []);

  const handleKurtiDelete = useCallback(async (updatedData: Kurti[]) => {
    setKurtiData(updatedData);
    setIsLoading(true);
  }, []);

  const handleTypeUpdate = useCallback(
    async (categoryName: string, newType: string) => {
      setCategories((prev) =>
        prev.map((cat) =>
          cat.name.toLowerCase() === categoryName.toLowerCase()
            ? { ...cat, type: newType }
            : cat
        )
      );
    },
    []
  );

  const handleSubmitCategory = useCallback(
    (values: z.infer<typeof categoryAddSchema>) => {
      startTransition(() => {
        categoryAddition(values)
          .then((data) => {
            if (data.error) {
              form.reset();
              toast.error(data.error);
              return;
            }
            if (data.success) {
              form.reset();
              toast.success(data.success);
              if (data.data) {
                const newCategory: Category = {
                  name: data.data.name,
                  count: 0,
                  type: data.data.type || "",
                  countOfPiece: 0,
                  sellingPrice: 0,
                  actualPrice: 0,
                  image: data.data.image || undefined,
                };
                setCategories((prev) => [...prev, newCategory]);
              }
            }
          })
          .catch(() => toast.error("Something went wrong!"));
      });
    },
    [form]
  );

  const handleSearchTypeChange = useCallback((value: string) => {
    if (Object.values(SEARCH_TYPES).includes(value as SearchTypeValue)) {
      setSearchType(value as SearchTypeValue);
      setCurrentPage(1);
      setKurtiCurrentPage(1);
    }
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleKurtiPageChange = useCallback((page: number) => {
    setKurtiCurrentPage(page);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [kurtiResponse, categoriesResponse] = await Promise.all([
          fetchKurtiData(),
          fetchCategories(),
        ]);

        const { categories: processedCats, totals: calculatedTotals } =
          calculateCategoryStats(kurtiResponse, categoriesResponse);

        setKurtiData(kurtiResponse);
        setCategories(processedCats);
        setTotals(calculatedTotals);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };

    if (isLoading) {
      loadData();
    }
  }, [isLoading, fetchKurtiData, fetchCategories]);

  const isSearching = searchValue.trim().length > 0;
  const showKurtiResults = searchType === SEARCH_TYPES.DESIGN && isSearching;

  if (isLoading) {
    return <PageLoader loading={true} />;
  }

  const handleCategoryUpdate = (
    updatedCategory: Category,
    originalName: string
  ) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.name.toLowerCase() === originalName.toLowerCase()
          ? updatedCategory
          : cat
      )
    );
  };

  const PaginationComponent = ({
    currentPage,
    totalPages,
    onPageChange,
  }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  }) => {
    const [goToPage, setGoToPage] = useState("");

    if (totalPages <= 1) return null;

    const getVisiblePages = () => {
      const delta = 2;
      const range = [];
      const rangeWithDots = [];

      for (
        let i = Math.max(2, currentPage - delta);
        i <= Math.min(totalPages - 1, currentPage + delta);
        i++
      ) {
        range.push(i);
      }

      if (currentPage - delta > 2) {
        rangeWithDots.push(1, "...");
      } else {
        rangeWithDots.push(1);
      }

      rangeWithDots.push(...range);

      if (currentPage + delta < totalPages - 1) {
        rangeWithDots.push("...", totalPages);
      } else {
        rangeWithDots.push(totalPages);
      }

      return rangeWithDots;
    };

    const visiblePages = getVisiblePages();

    const handleGoToPage = () => {
      const pageNumber = parseInt(goToPage);
      if (pageNumber >= 1 && pageNumber <= totalPages) {
        onPageChange(pageNumber);
        setGoToPage("");
      }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleGoToPage();
      }
    };

    return (
      <div className="flex flex-col items-center gap-4">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                className={
                  currentPage === 1
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>

            {visiblePages.map((page, index) => (
              <PaginationItem key={index}>
                {page === "..." ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    onClick={() => onPageChange(page as number)}
                    isActive={currentPage === page}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}

            <PaginationItem>
              <PaginationNext
                onClick={() =>
                  onPageChange(Math.min(totalPages, currentPage + 1))
                }
                className={
                  currentPage === totalPages
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">Go to page:</span>
          <Input
            type="number"
            min="1"
            max={totalPages}
            value={goToPage}
            onChange={(e) => setGoToPage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Page #"
            className="w-20 h-8 text-center"
          />
          <Button
            onClick={handleGoToPage}
            disabled={
              !goToPage ||
              parseInt(goToPage) < 1 ||
              parseInt(goToPage) > totalPages
            }
            size="sm"
            variant="outline"
          >
            Go
          </Button>
          <span className="text-gray-500">of {totalPages}</span>
        </div>
      </div>
    );
  };

  function downloadCSV(data: Category[]) {
    if (!data.length) return;

    const headers: (keyof Category)[] = [
      "name",
      "count",
      "type",
      "countOfPiece",
      "sellingPrice",
      "actualPrice",
      "image",
    ];

    const csv = [
      headers.join(","), // header row
      ...data.map((row) =>
        headers
          .map((field) =>
            row[field] === null || row[field] === undefined
              ? ""
              : `"${String(row[field]).replace(/"/g, '""')}"`
          )
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "items.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="w-[90%]">
      <CardHeader className="flex items-center">
        <p className="text-2xl font-semibold text-center">👜 Catalogue</p>
        <div className="ml-auto mt-7">
          <Button asChild>
            <DialogDemo
              dialogTrigger="+ Category"
              dialogTitle="New Category Addition"
              dialogDescription="Give category name and click add category"
              bgColor="destructive"
            >
              <Form {...form}>
                <form className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={isPending}
                            placeholder="Enter category name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={isPending}
                            placeholder="Enter category type"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="image"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image</FormLabel>
                        <FormControl>
                          <ImageUpload2
                            images={[field.value]}
                            singleFile
                            onImageChange={(data) => {
                              field.onChange(data[0]?.url || "");
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    disabled={isPending}
                    onClick={form.handleSubmit(handleSubmitCategory)}
                  >
                    Add Category
                  </Button>
                </form>
              </Form>
            </DialogDemo>
          </Button>
          <Button
            type="button"
            className="ml-2"
            disabled={isPending}
            onClick={() => downloadCSV(categories)}
          >
            Download CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="pb-2">
          <div className="flex flex-row justify-center mb-2 gap-4">
            <div className="w-[30%]">
              <h2 className="scroll-m-20 text-sm font-semibold tracking-tight first:mt-0">
                Select search type
              </h2>
              <Select onValueChange={handleSearchTypeChange} value={searchType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Search Field Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEARCH_TYPES.DESIGN}>
                    Search Design
                  </SelectItem>
                  <SelectItem value={SEARCH_TYPES.CATEGORY}>
                    Search Category
                  </SelectItem>
                  <SelectItem value={SEARCH_TYPES.PRICE}>
                    Search Price
                  </SelectItem>
                  <SelectItem value={SEARCH_TYPES.TYPE}>Search Type</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-[30%]">
              <h2 className="scroll-m-20 text-sm font-semibold tracking-tight first:mt-0">
                Select sort type
              </h2>
              <Select onValueChange={handleSortChange} value={sortType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Sort Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SORT_TYPES.PRICE_HIGH_TO_LOW}>
                    Sort By Price High to Low
                  </SelectItem>
                  <SelectItem value={SORT_TYPES.PRICE_LOW_TO_HIGH}>
                    Sort By Price Low to High
                  </SelectItem>
                  <SelectItem value={SORT_TYPES.PIECE_COUNT}>
                    Sort By Piece Count
                  </SelectItem>
                  <SelectItem value={SORT_TYPES.NAME}>Sort By Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[30%] mt-auto">
              <SearchBar
                value={searchValue}
                onChange={handleSearch}
                onCancelResearch={handleSearchCancel}
                width="100%"
                style={{
                  backgroundColor: "#fff",
                  border: "1px solid #ccc",
                  maxWidth: "400px",
                  marginTopL: "auto",
                }}
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-600">Total Items</p>
              <p className="text-xl font-bold text-blue-600">
                {totals.totalItems}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Pieces</p>
              <p className="text-xl font-bold text-green-600">
                {totals.totalPieces}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Stock Value</p>
              <p className="text-xl font-bold text-purple-600">
                ₹{totals.totalStockPrice.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Results */}
        {showKurtiResults ? (
          <>
            <div className="mb-4 text-center">
              <p className="text-sm text-gray-600">
                Showing {displayKurti.length} of {filteredKurti.length} designs
                {searchValue && ` for "${searchValue}"`}
              </p>
            </div>
            <CardContent className="w-full flex flex-row justify-center flex-wrap gap-3">
              {displayKurti.map((data, i) => (
                <KurtiPicCard
                  data={data}
                  key={`${data.id}-${i}`}
                  onKurtiDelete={handleKurtiDelete}
                />
              ))}
            </CardContent>
            {totalKurtiPages > 1 && (
              <div className="flex justify-center mt-4">
                <PaginationComponent
                  currentPage={kurtiCurrentPage}
                  totalPages={totalKurtiPages}
                  onPageChange={handleKurtiPageChange}
                />
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-4 text-center">
              <p className="text-sm text-gray-600">
                Showing {displayCategories.length} of{" "}
                {searchValue.trim().length > 0
                  ? filteredCategories.length
                  : processedCategories.length}{" "}
                categories
                {searchValue && ` for "${searchValue}"`}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Table>
                <TableCaption>List of all categories</TableCaption>
                <TableHeader>
                  <TableRow className="text-black">
                    <TableHead className="text-center font-bold text-base">
                      Sr.
                    </TableHead>
                    <TableHead className="text-center font-bold text-base">
                      Category
                    </TableHead>
                    <TableHead className="text-center font-bold text-base">
                      Image
                    </TableHead>
                    <TableHead className="text-center font-bold text-base">
                      Type
                    </TableHead>
                    <RoleGateForComponent
                      allowedRole={[UserRole.ADMIN, UserRole.UPLOADER]}
                    >
                      <TableHead className="text-center font-bold text-base">
                        Total Items
                      </TableHead>
                      <TableHead className="text-center font-bold text-base">
                        Total Pieces
                      </TableHead>
                    </RoleGateForComponent>
                    <TableHead className="text-center font-bold text-base">
                      Price
                    </TableHead>
                    <RoleGateForComponent allowedRole={[UserRole.ADMIN]}>
                      <TableHead className="text-center font-bold text-base">
                        Actions
                      </TableHead>
                    </RoleGateForComponent>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayCategories.map((cat, idx) => (
                    <TableRow key={`category-${cat.name}-${idx}`}>
                      <TableCell className="text-center">
                        {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                      </TableCell>
                      <TableCell className="text-center text-blue-800 font-bold cursor-pointer">
                        <Link href={`/catalogue/${cat.name.toLowerCase()}`}>
                          {cat.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-center">
                        <img
                          src={cat.image || "/images/no-image.png"}
                          alt={cat.name}
                          className="w-16 h-16 object-cover mx-auto"
                        />
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        {cat.type}
                        <TypeEdit
                          categoryName={cat.name}
                          onUpdateType={handleTypeUpdate}
                        />
                      </TableCell>
                      <RoleGateForComponent
                        allowedRole={[UserRole.ADMIN, UserRole.UPLOADER]}
                      >
                        <TableCell className="text-center">
                          {cat.count}
                        </TableCell>
                        <TableCell className="text-center">
                          {cat.countOfPiece}
                        </TableCell>
                      </RoleGateForComponent>
                      <TableCell className="text-center">
                        {cat.sellingPrice}
                      </TableCell>
                      <RoleGateForComponent allowedRole={[UserRole.ADMIN]}>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <EditCategoryModal
                              category={cat}
                              onCategoryUpdate={(updatedCat) => {
                                handleCategoryUpdate(updatedCat, cat.name);
                              }}
                              trigger={
                                <Button variant="outline" size="sm">
                                  Edit
                                </Button>
                              }
                            />

                            <DialogDemo
                              dialogTrigger="Delete"
                              dialogTitle="Delete Category"
                              dialogDescription="Delete the category"
                              bgColor="destructive"
                            >
                              <div>
                                <h1>Delete Category</h1>
                                <h3>
                                  Are you sure you want to delete category "
                                  {cat.name}"?
                                </h3>
                              </div>
                              <Button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleDeleteCategory(cat.name)}
                              >
                                Delete
                              </Button>
                            </DialogDemo>
                          </div>
                        </TableCell>
                      </RoleGateForComponent>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {totalCategoryPages > 1 && (
              <div className="flex justify-center mt-4">
                <PaginationComponent
                  currentPage={currentPage}
                  totalPages={totalCategoryPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

const CatalogueListHelper = () => {
  return (
    <RoleGateForComponent
      allowedRole={[
        UserRole.ADMIN,
        UserRole.UPLOADER,
        UserRole.SELLER,
        UserRole.RESELLER,
      ]}
    >
      <ListPage />
    </RoleGateForComponent>
  );
};

export default CatalogueListHelper;
