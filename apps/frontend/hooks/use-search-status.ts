"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiError } from "@/lib/api-client";
import { searchesGetStatus, type SearchRunItem } from "@/lib/backend-api";

export function isPollingStatus(status: SearchRunItem["status"] | undefined): boolean {
  return status === "QUEUED" || status === "RUNNING";
}

export function useSearchStatus(id: string, pollMs = 2500) {
  const [latestRun, setLatestRun] = useState<SearchRunItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status = await searchesGetStatus(id);
      setLatestRun(status.latestRun);
      return status.latestRun;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load run status");
      return null;
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!isPollingStatus(latestRun?.status)) return;
    const t = window.setInterval(() => {
      void fetchStatus();
    }, pollMs);
    return () => window.clearInterval(t);
  }, [latestRun?.status, pollMs, fetchStatus]);

  return {
    latestRun,
    loading,
    error,
    setLatestRun,
    fetchStatus,
  };
}
