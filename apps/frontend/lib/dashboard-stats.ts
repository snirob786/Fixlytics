import type { SavedSearchListItem } from "@fixlytics/types";

import { searchesList, searchesListLeads } from "@/lib/backend-api";

export type DashboardStats = {
  totalSearches: number;
  totalLeads: number;
  underperformingLeads: number;
  recentSearches: SavedSearchListItem[];
};

/**
 * Aggregates dashboard metrics using existing list endpoints (no new backend routes).
 */
export async function fetchDashboardStats(): Promise<DashboardStats> {
  const pageSize = 50;
  let page = 1;
  const all: SavedSearchListItem[] = [];
  let totalSearches = 0;
  let totalLeads = 0;
  let underperformingLeads = 0;

  for (;;) {
    const batch = await searchesList({ page, pageSize });
    if (page === 1) totalSearches = batch.total;
    all.push(...batch.items);
    for (const s of batch.items) {
      totalLeads += s.leadCount;
    }
    if (batch.items.length) {
      const counts = await Promise.all(
        batch.items.map((s) =>
          searchesListLeads(s.id, { page: 1, pageSize: 1, underperformingOnly: true }).then(
            (r) => r.total,
          ),
        ),
      );
      underperformingLeads += counts.reduce((a, n) => a + n, 0);
    }
    if (!batch.hasNext) break;
    page += 1;
  }

  const recentSearches = all
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return { totalSearches, totalLeads, underperformingLeads, recentSearches };
}
