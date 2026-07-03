import { AdminGuard } from "@/components/admin/AdminGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function Home() {
  return (
    <AdminGuard>
      <DashboardShell />
    </AdminGuard>
  );
}
