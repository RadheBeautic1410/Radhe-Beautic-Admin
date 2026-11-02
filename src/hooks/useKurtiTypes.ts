"use client";

import { useEffect, useState } from "react";
import { getKurtiTypeOptions } from "@/src/actions/kurti-types";
import { BUILT_IN_KURTI_TYPES } from "@/src/lib/kurti-types";

export interface KurtiTypeOption {
  key: string;
  name: string;
  isHidden: boolean;
}

const BUILT_IN_OPTIONS: KurtiTypeOption[] = BUILT_IN_KURTI_TYPES.map((t) => ({
  key: t.key,
  name: t.name,
  isHidden: t.isHidden ?? false,
}));

// The edit category form mounts once per catalogue row, so all of them share
// one request instead of each calling the server.
const CACHE_MS = 60_000;
let cached: { at: number; rows: Promise<KurtiTypeOption[]> } | null = null;

const loadOptions = () => {
  if (!cached || Date.now() - cached.at > CACHE_MS) {
    const rows = getKurtiTypeOptions().catch((error) => {
      console.error("Error fetching kurti types:", error);
      cached = null;
      return [];
    });
    cached = { at: Date.now(), rows };
  }
  return cached.rows;
};

/** Kurti types for admin forms and filters; hidden types stay listed so their categories can be edited. */
export function useKurtiTypes() {
  const [kurtiTypes, setKurtiTypes] = useState<KurtiTypeOption[]>(BUILT_IN_OPTIONS);

  useEffect(() => {
    let active = true;
    loadOptions().then((rows) => {
      if (active && rows.length > 0) setKurtiTypes(rows);
    });
    return () => {
      active = false;
    };
  }, []);

  return kurtiTypes;
}
