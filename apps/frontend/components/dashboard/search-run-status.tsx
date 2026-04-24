import type { SearchRunItem, SearchRunStatus } from "@/lib/backend-api";
import { Badge } from "@/components/ui/badge";

export type DashboardRunUiStatus = "idle" | "running" | "completed" | "failed";

export function runToUiStatus(latest: SearchRunItem | null | undefined): DashboardRunUiStatus {
  if (!latest) return "idle";
  if (latest.status === "QUEUED" || latest.status === "RUNNING") return "running";
  if (latest.status === "FAILED") return "failed";
  return "completed";
}

export function SearchRunStatusBadge({ status }: { status: DashboardRunUiStatus }) {
  switch (status) {
    case "running":
      return <Badge variant="warning">Running</Badge>;
    case "completed":
      return <Badge variant="success">Completed</Badge>;
    case "failed":
      return <Badge variant="destructive">Failed</Badge>;
    default:
      return <Badge variant="secondary">Idle</Badge>;
  }
}

export function searchRunStatusLabel(status: SearchRunStatus): string {
  switch (status) {
    case "QUEUED":
      return "Queued";
    case "RUNNING":
      return "Running";
    case "COMPLETED":
      return "Completed";
    case "FAILED":
      return "Failed";
    default:
      return status;
  }
}
