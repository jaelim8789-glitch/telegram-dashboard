import { AdminGuard } from "@/components/admin/AdminGuard";

export default function ChatManagementLayout({ children }: { children: React.ReactNode }) {
  return <AdminGuard>{children}</AdminGuard>;
}
