import { useCallback, useEffect, useRef, useState } from "react";

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

  // Each keystroke fires its own request and a short code prefix (which matches
  // far more rows) answers much slower than the full code. Without this guard a
  // stale response lands last and the list shows codes that don't match what was
  // typed, so only the newest request is ever allowed to write to state.
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!search || search.startsWith("🔍")) {
      // Image/semantic search fills the list through setKurtiData; leave that
      // data alone, but retire any request still in flight.
      requestIdRef.current += 1;
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();

    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      search,
    });
    fetch(`/api/kurti/getall?${params}`, { signal: controller.signal })
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
  }, [page, limit, search]);

  const setKurtiData = useCallback((data: Kurti[]) => {
    // Results pushed in from image/semantic search are not paginated and must
    // not be clobbered by a code search that is still resolving.
    requestIdRef.current += 1;
    setData(data);
    setPagination(undefined);
    setLoading(false);
  }, []);

  return { data, pagination, loading, error, setKurtiData };
}
