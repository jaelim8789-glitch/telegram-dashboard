import type { Metadata } from "next";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AppShell } from "@/components/layout/AppShell";
import { CategoryRouter } from "@/components/categories/CategoryRouter";

export const metadata: Metadata = {
  title: "TeleMon",
  description: "Telegram Management Dashboard",
};

export default function AppPage() {
  return (
    <AdminGuard>
      <AppShell
        leftPanel={<CategoryRouter panel="left" />}
        rightPanel={<CategoryRouter panel="right" />}
      >
        <CategoryRouter panel="center" />
      </AppShell>
    </AdminGuard>
  );
}
