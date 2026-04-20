import { ProtectedShell } from "@/components/protected-shell";

export default function AppSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedShell>{children}</ProtectedShell>;
}
