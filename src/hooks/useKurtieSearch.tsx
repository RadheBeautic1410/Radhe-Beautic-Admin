import { useEffect, useState } from "react";

interface Kurti {
  id: string;
  category: string;
  code: string;
  images: any[];
  videos?: any[];
  sizes: any[];
  party: string;
  sellingPrice: string;
  actualPrice: string;
  isDeleted: boolean;
}

interface CategoriesPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function useKurtiSearch({ page = 1, limit = 12, search = "" }) {
  const [data, setData] = useState<Kurti[]>([]);
  const [pagination, setPagination] = useState<
    CategoriesPaginationMeta | undefined
  >();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!search) return;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      search,
    });
    fetch(`/api/kurti/getall?${params}`)
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
  }, [page, limit, search]);

  const setKurtiData = (data: Kurti[]) => {
    setData(data);
  };

  return { data, pagination, loading, error,setKurtiData };
}
