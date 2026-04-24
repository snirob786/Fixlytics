import type { SearchRun, SearchRunStatus } from "@prisma/client";

export type SearchRunResponseDto = {
  id: string;
  searchId: string;
  status: SearchRunStatus;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
  jobId: string | null;
  createdAt: string;
};

export function toSearchRunResponse(row: SearchRun): SearchRunResponseDto {
  return {
    id: row.id,
    searchId: row.searchId,
    status: row.status,
    startedAt: row.startedAt?.toISOString() ?? null,
    finishedAt: row.finishedAt?.toISOString() ?? null,
    error: row.error,
    jobId: row.jobId,
    createdAt: row.createdAt.toISOString(),
  };
}
