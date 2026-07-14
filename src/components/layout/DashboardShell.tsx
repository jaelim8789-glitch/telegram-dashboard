"use client";

import { useCallback, useState } from "react";
import { Menu, X } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Workspace } from "@/components/layout/Workspace";
import { Inspector } from "@/components/layout/Inspector";
import { CommandPaletteTrigger } from "@/components/workspace/CommandPalette";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";

export function DashboardShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((v) => !v);
    setInspectorOpen(false);
  }, []);
  const toggleInspector = useCallback(() => {
    setInspectorOpen((v) => !v);
    setSidebarOpen(false);
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-app-bg text-app-text">
      <OnboardingTour />
      <Header />
      {/* Mobile nav toggle */}
      <div className="flex items-center gap-2 border-b border-app-border bg-app-surface px-3 py-1.5 sm:hidden" role="toolbar" aria-label="모바일 탐색">
        <button
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? "계정 사이드바 닫기" : "계정 사이드바 열기"}
          aria-expanded={sidebarOpen}
          aria-controls="dashboard-sidebar"
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-app-text-muted hover:text-app-text hover:bg-app-card transition-all"
        >
          <Menu className="h-3.5 w-3.5" /> 계정
        </button>
        <CommandPaletteTrigger />
        <button
          onClick={toggleInspector}
          aria-label={inspectorOpen ? "인스펙터 패널 닫기" : "인스펙터 패널 열기"}
          aria-expanded={inspectorOpen}
          aria-controls="dashboard-inspector"
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-app-text-muted hover:text-app-text hover:bg-app-card transition-all ml-auto"
        >
          인스펙터 <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1">
        {/* Sidebar — always visible on desktop, overlay on mobile */}
        <div
          id="dashboard-sidebar"
          role="complementary"
          aria-label="계정 목록"
          className={`${sidebarOpen ? "fixed inset-0 z-40 flex" : "hidden"} sm:relative sm:z-auto sm:flex`}
        >
          {sidebarOpen && (
            <div className="fixed inset-0 bg-black/50 sm:hidden" onClick={() => setSidebarOpen(false)} />
          )}
          <div className={`relative z-10 ${sidebarOpen ? "block" : "hidden"} sm:block`}>
            <Sidebar />
          </div>
        </div>
        <Workspace />
        {/* Inspector — always visible on desktop, toggle on mobile (higher z than sidebar) */}
        <div
          id="dashboard-inspector"
          role="complementary"
          aria-label="인스펙터"
          className={`${inspectorOpen ? "fixed inset-0 z-50 flex justify-end" : "hidden"} sm:relative sm:z-auto sm:flex`}
        >
          {inspectorOpen && (
            <div className="fixed inset-0 bg-black/50 sm:hidden" onClick={() => setInspectorOpen(false)} />
          )}
          <div className={`relative z-10 ${inspectorOpen ? "block" : "hidden"} sm:block`}>
            <Inspector />
          </div>
        </div>
      </div>
    </div>
  );
}
