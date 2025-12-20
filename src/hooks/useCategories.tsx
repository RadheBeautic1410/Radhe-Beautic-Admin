import { useState, useEffect } from "react";

interface Category {
  id: string;
  name: string;
  count: number;
  type: string;
  kurtiType?: string;
  countTotal: number;
  totalItems: number;
  sellingPrice: number;
  actualPrice: number;
  customerPrice?: number;
  image?: string;
  bigPrice?: number;
  walletDiscount?: number;
  code?: string;
  isStockReady: boolean;
}
interface CategoriesPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function useCategories({
  page = 1,
  limit = 20,
  search = "",
  searchType = "category",
  sort = "PRICE_HIGH_TO_LOW",
  kurtiType = "",
}) {
  const [data, setData] = useState<Category[]>([]);
  const [pagination, setPagination] = useState<
    CategoriesPaginationMeta | undefined
  >();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      search,
      searchType,
      sort,
      kurtiType,
    });
    fetch(`/api/category?${params}`)
      .then((res) => res.json())
      .then(({ data, pagination }) => {
        setData(data);
        setPagination(pagination);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Unknown error");
        setLoading(false);
      });
  }, [page, limit, search, searchType, sort, kurtiType]);

  const setCategoryData = (data: Category[]) => {
    setData(data);
  };

  return { data, pagination, loading, error, setCategoryData };
}
