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
import SearchBar from "@mkyy/mui-search-bar";
import KurtiPicCard from "../_components/kurti/kurtiPicCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
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

// Fix 1: Create a proper type for searchType
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

const ListPage = () => {
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [kurtiData, setKurtiData] = useState<Kurti[]>([]);
  const [searchValue, setSearchValue] = useState("");
  // Fix 2: Use the proper type for searchType
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

  const [isPending, startTransition] = useTransition();

  // Form
  const form = useForm({
    defaultValues: {
      name: "",
      type: "",
      image: "",
    },
  });

  // API calls
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

  // Data processing
  const processedCategories = useMemo(() => {
    if (!categories.length || !kurtiData.length) return categories;

    const { categories: updatedCategories } = calculateCategoryStats(
      kurtiData,
      categories
    );
    return sortCategories(updatedCategories, sortType);
  }, [categories, kurtiData, sortType]);

  // Filtered data based on search
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
          filteredKurti: kurtiData
            .filter((kurti) => kurti.code.toLowerCase().includes(searchTerm))
            .slice(0, 20),
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

  // Event handlers
  const handleSearch = useCallback((newValue: string) => {
    setSearchValue(newValue);
  }, []);

  const handleSearchCancel = useCallback(() => {
    setSearchValue("");
  }, []);

  const handleSortChange = useCallback((newSortType: string) => {
    setSortType(newSortType);
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
            // Trigger data refresh
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
              // Fix 3: Ensure data.data matches Category interface
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

  // Fix 4: Create a type-safe handler for search type change
  const handleSearchTypeChange = useCallback((value: string) => {
    // Type guard to ensure the value is valid
    if (Object.values(SEARCH_TYPES).includes(value as SearchTypeValue)) {
      setSearchType(value as SearchTypeValue);
    }
  }, []);

  // Effects
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

  // Render
  const isSearching = searchValue.trim().length > 0;
  const showKurtiResults = searchType === SEARCH_TYPES.DESIGN && isSearching;
  const displayCategories = isSearching
    ? filteredCategories
    : processedCategories;

  if (isLoading) {
    return <PageLoader loading={true} />;
  }

  return (
    <Card className="w-[90%]">
      <CardHeader className="flex items-center">
        <p className="text-2xl font-semibold text-center">👜 Catalogue</p>
        <div className="ml-3 mt-7">
          <Button asChild>
            <DialogDemo
              dialogTrigger="Add Category"
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
        </div>
      </CardHeader>

      <CardContent>
        {/* Controls */}
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
          </div>

          <SearchBar
            value={searchValue}
            onChange={handleSearch}
            onCancelResearch={handleSearchCancel}
            width="100%"
            style={{
              backgroundColor: "#fff",
              border: "1px solid #ccc",
            }}
          />
        </div>

        {/* Results */}
        {showKurtiResults ? (
          <CardContent className="w-full flex flex-row justify-center flex-wrap gap-3">
            {filteredKurti.map((data, i) => (
              <KurtiPicCard
                data={data}
                key={`${data.id}-${i}`}
                onKurtiDelete={handleKurtiDelete}
              />
            ))}
          </CardContent>
        ) : (
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
                    <TableCell className="text-center">{idx + 1}</TableCell>
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
                      <TableCell className="text-center">{cat.count}</TableCell>
                      <TableCell className="text-center">
                        {cat.countOfPiece}
                      </TableCell>
                    </RoleGateForComponent>
                    <TableCell className="text-center">
                      {cat.sellingPrice}
                    </TableCell>
                    <RoleGateForComponent allowedRole={[UserRole.ADMIN]}>
                      <TableCell className="text-center">
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
                      </TableCell>
                    </RoleGateForComponent>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
