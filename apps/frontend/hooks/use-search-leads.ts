"use client";

import type { LeadListItem, Paginated } from "@fixlytics/types";
import { useCallback, useEffect, useState } from "react";

import { ApiError } from "@/lib/api-client";
import { searchesListLeads } from "@/lib/backend-api";

type LeadsFilters = {
  underperformingOnly: boolean;
};

export function useSearchLeads(id: string, filters: LeadsFilters) {
  const [leads, setLeads] = useState<Paginated<LeadListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await searchesListLeads(id, {
        page: 1,
        pageSize: 50,
        underperformingOnly: filters.underperformingOnly,
      });
      setLeads(next);
      return next;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load leads");
      return null;
    } finally {
      setLoading(false);
    }
  }, [id, filters.underperformingOnly]);

  useEffect(() => {
    void fetchLeads();
  }, [fetchLeads]);

  return {
    leads,
    loading,
    error,
    fetchLeads,
  };
}
