"use client";

import type { SavedSearchDetail } from "@fixlytics/types";
import { useCallback, useEffect, useState } from "react";

import { ApiError } from "@/lib/api-client";
import { searchesGet } from "@/lib/backend-api";

export function useSearchDetail(id: string) {
  const [detail, setDetail] = useState<SavedSearchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await searchesGet(id);
      setDetail(next);
      return next;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load search");
      return null;
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  return {
    detail,
    loading,
    error,
    setDetail,
    fetchDetail,
  };
}
