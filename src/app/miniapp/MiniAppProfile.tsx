"use client";

import { useEffect, useState, memo, useCallback } from "react";
import { initData, useSignal, hapticFeedback } from "@tma.js/sdk-react";
import { User, Settings, LogOut, ChevronRight, Star, Bell, Globe, Info, ExternalLink, Activity, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { clearAll } from "@/lib/auth";
import { SITE } from "@/lib/site";
import { fetchAuthMe } from "@/lib/api";
import { fetchAccountHealthScore } from "@/lib/api-miniapp";
import Image from "next/image";

interface AccountHealth { id: string; phone: string; status: "healthy" | "warning" | "error"; healthScore: number; }

function HealthBadge({ status }: { status: string }) {
  const config = { healthy: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/20", label: "정상" }, warning: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/20", label: "주의" }, error: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/20", label: "오류" } };
  const c = config[status as keyof typeof config] || config.healthy;
  const Icon = c.icon;
  return <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 ${c.bg}`}><Icon className={`h-3 w-3 ${c.color}`} /><span className={`text-[10px] font-medium ${c.color}`}>{c.label}</span></div>;
}

function MenuItem({ icon, label, value, href, danger, onClick }: { icon: React.ReactNode; label: string; value?: string; href?: string; danger?: boolean; onClick?: () => void }) {
  const handleClick = () => { try { hapticFeedback.impactOccurred("light"); } catch {} if (onClick) onClick(); else if (href) window.location.href = href; };
  return (
    <button onClick={handleClick} className="flex w-full items-center justify-between px-4 py-4 transition-colors active:bg-[var(--tg-theme-section-separator-color,#3a4a5a)]"
      style={{ color: danger ? "var(--tg-theme-destructive-text-color, #ec3942)" : "var(--tg-theme-text-color, #f5f5f5)" }} aria-label={label}>
      <div className="flex items-center gap-3">
        <span className="flex h-6 w-6 items-center justify-center" style={{ color: danger ? "var(--tg-theme-destructive-text-color, #ec3942)" : "var(--tg-theme-button-color, #5288c1)" }}>{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-2">{value && <span className="text-xs" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>{value}</span>}<ChevronRight className="h-5 w-5" style={{ color: "var(--tg-theme-hint-color, #708499)" }} /></div>
    </button>
  );
}

export const MiniAppProfile = memo(function MiniAppProfile() {
  const initDataState = useSignal(initData.state);
  const user = initDataState?.user;
  const [planName, setPlanName] = useState("Free");
  const [accounts, setAccounts] = useState<AccountHealth[]>([]);
  const [stats, setStats] = useState({ todaySent: 0, weekSent: 0, successRate: 0 });

  useEffect(() => {
    fetchAuthMe().then(me => setPlanName(me.plan === "ai_premium" ? "AI Premium" : me.plan || "Free")).catch(() => {});
    import("@/lib/api").then(({ fetchAccounts }) =>
      fetchAccounts().then(async list => {
        const active = list.filter(a => a.status === "active").slice(0, 5);
        const healthResults = await Promise.allSettled(active.map(a => fetchAccountHealthScore(a.id)));
        setAccounts(active.map((a, i) => ({
          id: a.id, phone: a.phone,
          status: healthResults[i]?.status === "fulfilled" && (healthResults[i] as any).value > 60 ? "healthy" : healthResults[i]?.status === "fulfilled" ? "warning" : "error",
          healthScore: healthResults[i]?.status === "fulfilled" ? (healthResults[i] as any).value : 0,
        })));
        setStats({ todaySent: active.reduce((s, a) => s + a.todaySent, 0), weekSent: 0, successRate: 94 });
      })
    ).catch(() => {});
  }, []);

  const handleLogout = useCallback(() => { try { hapticFeedback.notificationOccurred("warning"); } catch {} clearAll(); window.location.href = "/"; }, []);

  return (
    <div className="pb-4">
      <div className="flex flex-col items-center py-8 px-4">
        <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold" style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)", color: "var(--tg-theme-button-color, #5288c1)" }}>
          {user?.photo_url ? <Image src={user.photo_url} alt={user.first_name || ""} width={80} height={80} className="h-full w-full rounded-full object-cover" unoptimized /> : user?.first_name?.charAt(0)?.toUpperCase() || "U"}
        </div>
        <h2 className="text-lg font-bold">{user?.first_name || "사용자"}</h2>
        {user?.username && <p className="text-sm" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>@{user.username}</p>}
        <div className="mt-2 rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: planName === "AI Premium" ? "rgba(168, 85, 247, 0.2)" : "var(--tg-theme-section-bg-color, #232e3c)", color: planName === "AI Premium" ? "#a855f7" : "var(--tg-theme-hint-color, #708499)" }}>{planName}</div>
      </div>

      {accounts.length > 0 && (
        <div className="mx-4 mb-4 rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "var(--tg-theme-section-separator-color, #3a4a5a)" }}>
            <Activity className="h-4 w-4" style={{ color: "var(--tg-theme-button-color, #5288c1)" }} />
            <span className="text-sm font-semibold">계정 건강</span>
            <span className="ml-auto text-xs" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>{stats.todaySent}건 / 오늘</span>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--tg-theme-section-separator-color, #3a4a5a)" }}>
            {accounts.map(acc => (
              <div key={acc.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-mono truncate block">{acc.phone}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="h-1 rounded-full flex-1 overflow-hidden bg-gray-700">
                      <div className={`h-full rounded-full ${acc.healthScore > 60 ? "bg-emerald-500" : acc.healthScore > 30 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${acc.healthScore}%` }} />
                    </div>
                    <span className="text-[10px] w-6 text-right font-medium" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>{acc.healthScore}</span>
                  </div>
                </div>
                <HealthBadge status={acc.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mx-4 rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}>
        <MenuItem icon={<User className="h-5 w-5" />} label="계정 관리" href="/app" />
        <div className="mx-4 h-px" style={{ backgroundColor: "var(--tg-theme-section-separator-color, #3a4a5a)" }} />
        <MenuItem icon={<Settings className="h-5 w-5" />} label="전체 대시보드" value="Web" href="/app" />
        <div className="mx-4 h-px" style={{ backgroundColor: "var(--tg-theme-section-separator-color, #3a4a5a)" }} />
        <MenuItem icon={<Star className="h-5 w-5" />} label="요금제" value={planName} href="/pricing" />
        <div className="mx-4 h-px" style={{ backgroundColor: "var(--tg-theme-section-separator-color, #3a4a5a)" }} />
        <MenuItem icon={<Bell className="h-5 w-5" />} label="알림 설정" href="/app" />
        <div className="mx-4 h-px" style={{ backgroundColor: "var(--tg-theme-section-separator-color, #3a4a5a)" }} />
        <MenuItem icon={<Globe className="h-5 w-5" />} label="웹 버전 열기" href={SITE.app} />
      </div>

      <div className="mx-4 mt-4 rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}>
        <MenuItem icon={<Info className="h-5 w-5" />} label="버전 정보" value="v0.1.0" />
        <div className="mx-4 h-px" style={{ backgroundColor: "var(--tg-theme-section-separator-color, #3a4a5a)" }} />
        <MenuItem icon={<ExternalLink className="h-5 w-5" />} label="문의하기" href={`https://t.me/${SITE.support?.telegram?.replace("@", "") || "telemon"}`} />
      </div>

      <div className="mx-4 mt-4 rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}>
        <MenuItem icon={<LogOut className="h-5 w-5" />} label="로그아웃" danger onClick={handleLogout} />
      </div>
    </div>
  );
});
