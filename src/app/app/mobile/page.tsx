"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { MobileDashboard } from "@/components/workspace/MobileDashboard";
import { MobileFab } from "@/components/ui/MobileFab";

export default function MobilePage() {
  return (
    <div className="min-h-screen bg-app-bg">
      <div className="sticky top-0 z-30 border-b border-app-border/60 bg-app-bg/80 backdrop-blur-lg">
        <div className="flex items-center gap-2 px-4 h-12">
          <Link
            href="/app"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="text-sm font-semibold">모바일 대시보드</span>
        </div>
      </div>

      <div className="px-4 pt-4 pb-24">
        <MobileDashboard />
      </div>

      <MobileFab />
    </div>
  );
}
