"use client";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AccountsPageClient } from "./AccountsPageClient";



export default function AccountsPage() {
  return (
    <AdminGuard>
      <AccountsPageClient />
    </AdminGuard>
  );
}