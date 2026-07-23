"use client";

import { UserCog, User, MessageCircle, Star, Folder, Key, FileText, Workflow, Share2, ArrowRight } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { TABS, type TabId } from "@/types";
import { cn } from "@/lib/cn";

const SETTINGS_FEATURES: TabId[] = ["team", "profile", "guestbot", "stars", "folders", "apikeys", "audit", "triggers", "referral"];

const FEATURE_META: Record<string, { icon: React.ComponentType<{ className?: string }>; desc: string; color: string }> = {
  team: { icon: UserCog, desc: "팀원 및 권한 관리", color: "text-blue-500" },
  profile: { icon: User, desc: "개인 프로필 설정", color: "text-emerald-500" },
  guestbot: { icon: MessageCircle, desc: "게스트 봇 설정", color: "text-purple-500" },
  stars: { icon: Star, desc: "Telegram Stars 결제", color: "text-amber-500" },
  folders: { icon: Folder, desc: "그룹 폴더 관리", color: "text-indigo-500" },
  apikeys: { icon: Key, desc: "API 키 발급 및 관리", color: "text-rose-500" },
  audit: { icon: FileText, desc: "계정 활동 로그", color: "text-gray-500" },
  triggers: { icon: Workflow, desc: "자동화 트리거 규칙", color: "text-orange-500" },
  referral: { icon: Share2, desc: "추천인 프로그램", color: "text-green-500" },
};

export function SettingsHub() {
  const navigateToFeature = useDashboardStore((s) => s.navigateToFeature);
  const plan = useDashboardStore((s) => s.plan);
  const subscriptionStatus = useDashboardStore((s) => s.subscriptionStatus);
  const settingsTabs = TABS.filter((t) => SETTINGS_FEATURES.includes(t.id));

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold text-app-text">설정</h2>

      <div className="rounded-xl border border-app-border/50 bg-app-card px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app-primary/10">
            <User className="h-5 w-5 text-app-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-app-text">{plan || "Free"} 플랜</p>
            <p className="text-[11px] text-app-text-muted">{subscriptionStatus === "active" ? "활성 구독 중" : subscriptionStatus === "trialing" ? "체험 중" : "무료 플랜"}</p>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold text-app-text-muted uppercase tracking-wider">설정 메뉴</p>
        {settingsTabs.map((tab) => {
          const meta = FEATURE_META[tab.id];
          const Icon = meta?.icon || FileText;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => navigateToFeature(tab.id)}
              className="flex w-full items-center gap-3 rounded-xl border border-app-border bg-app-card px-3 py-3 text-left transition-all hover:border-app-primary/30 hover:bg-app-card-hover active:scale-[0.98]"
            >
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", "bg-app-card-hover")}>
                <Icon className={cn("h-4.5 w-4.5", meta?.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-app-text">{tab.label}</p>
                {meta?.desc && <p className="text-[11px] text-app-text-muted truncate">{meta.desc}</p>}
              </div>
              <ArrowRight className="h-4 w-4 text-app-text-muted shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
