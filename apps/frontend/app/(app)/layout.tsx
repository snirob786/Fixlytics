import { AppDashboardShell } from "@/components/dashboard/app-dashboard-shell";
import { ProtectedShell } from "@/components/protected-shell";

export default function AppSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedShell>
      <AppDashboardShell>{children}</AppDashboardShell>
    </ProtectedShell>
  );
}
