import { useState, useEffect, useRef, useCallback } from "react";

interface Category {
  id: string;
  name: string;
  count: number;
  type: string;
  kurtiType?: string;
  countTotal: number;
  totalItems: number;
  fullSetItems?: number;
  sellingPrice: number;
  actualPrice: number;
  customerPrice?: number;
  image?: string;
  bigPrice?: number;
  walletDiscount?: number;
  code?: string;
  isStockReady: boolean;
  isVisibleForCustomer?: boolean;
  description?: string | null;
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

  // A broad search term answers slower than a narrow one, so without an
  // ordering guard an earlier keystroke's response can land last and show rows
  // that don't match what was typed. Only the newest request may write state.
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    const controller = new AbortController();

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
    fetch(`/api/category?${params}`, { signal: controller.signal })
      .then((res) => res.json())
      .then(({ data, pagination }) => {
        if (requestId !== requestIdRef.current) return;
        setData(Array.isArray(data) ? data : []);
        setPagination(pagination);
        setLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted || requestId !== requestIdRef.current)
          return;
        setError(err.message || "Unknown error");
        setData([]);
        setPagination(undefined);
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [page, limit, search, searchType, sort, kurtiType]);

  const setCategoryData = useCallback((data: Category[]) => {
    requestIdRef.current += 1;
    setData(data);
    setLoading(false);
  }, []);

  return { data, pagination, loading, error, setCategoryData };
}
