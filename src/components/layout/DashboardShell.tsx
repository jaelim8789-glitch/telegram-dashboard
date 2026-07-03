import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Workspace } from "@/components/layout/Workspace";
import { Inspector } from "@/components/layout/Inspector";

export function DashboardShell() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-950 text-neutral-100">
      <Header />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <Workspace />
        <Inspector />
      </div>
    </div>
  );
}
