import type { Metadata } from "next";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { AdminGuard } from "@/components/admin/AdminGuard";

export const metadata: Metadata = {
  title: "Management Dashboard",
  description: "개인 연구용 Telegram 관리 대시보드",
};

export default function AppPage() {
  return (
    <AdminGuard>
      <DashboardShell />
    </AdminGuard>
  );
}
