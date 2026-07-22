"use client";

import { useEffect, useState } from "react";
import { initData, useSignal, hapticFeedback } from "@tma.js/sdk-react";
import {
  User, Settings, LogOut, ChevronRight, Star, Bell,
  Globe, Info, ExternalLink,
} from "lucide-react";
import { clearAll } from "@/lib/auth";
import { SITE } from "@/lib/site";
import { fetchAuthMe } from "@/lib/api";
import Image from "next/image";

function MenuItem({
  icon,
  label,
  value,
  href,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  href?: string;
  danger?: boolean;
  onClick?: () => void;
}) {
  const handleClick = () => {
    try { hapticFeedback.impactOccurred("light"); } catch {}
    if (onClick) {
      onClick();
    } else if (href) {
      window.location.href = href;
    }
  };

  return (
    <button
      onClick={handleClick}
      className="flex w-full items-center justify-between px-4 py-4 transition-colors active:bg-[var(--tg-theme-section-separator-color,#3a4a5a)]"
      style={{
        color: danger ? "var(--tg-theme-destructive-text-color, #ec3942)" : "var(--tg-theme-text-color, #f5f5f5)",
      }}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-6 w-6 items-center justify-center" style={{ color: danger ? "var(--tg-theme-destructive-text-color, #ec3942)" : "var(--tg-theme-button-color, #5288c1)" }}>
          {icon}
        </span>
        <span className="text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="text-xs" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>{value}</span>}
        <ChevronRight className="h-5 w-5" style={{ color: "var(--tg-theme-hint-color, #708499)" }} />
      </div>
    </button>
  );
}

export function MiniAppProfile() {
  const initDataState = useSignal(initData.state);
  const user = initDataState?.user;
  const [planName, setPlanName] = useState("Free");

  useEffect(() => {
    fetchAuthMe()
      .then((me) => setPlanName(me.plan === "ai_premium" ? "AI Premium" : me.plan || "Free"))
      .catch((e) => console.error("[MiniAppProfile] fetchAuthMe 실패", e));
  }, []);

  const handleLogout = () => {
    try { hapticFeedback.notificationOccurred("warning"); } catch {}
    clearAll();
    window.location.href = "/";
  };

  return (
    <div className="pb-4">
      <div className="flex flex-col items-center py-8 px-4">
        <div
          className="mb-3 flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold"
          style={{
            backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)",
            color: "var(--tg-theme-button-color, #5288c1)",
          }}
        >
          {user?.photo_url ? (
            <Image 
              src={user.photo_url} 
              alt={user.first_name} 
              width={80}
              height={80}
              className="h-full w-full rounded-full object-cover"
              priority={false}
              unoptimized // 외부 이미지이므로 최적화 비활성화
            />
          ) : (
            user?.first_name?.charAt(0)?.toUpperCase() || "U"
          )}
        </div>
        <h2 className="text-lg font-bold">{user?.first_name || "사용자"}</h2>
        {user?.username && (
          <p className="text-sm" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>
            @{user.username}
          </p>
        )}
        <div
          className="mt-2 rounded-full px-3 py-1 text-xs font-medium"
          style={{
            backgroundColor: planName === "AI Premium" ? "rgba(168, 85, 247, 0.2)" : "var(--tg-theme-section-bg-color, #232e3c)",
            color: planName === "AI Premium" ? "#a855f7" : "var(--tg-theme-hint-color, #708499)",
          }}
        >
          {planName === "AI Premium" ? "AI Premium" : planName}
        </div>
      </div>

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
        <MenuItem
          icon={<ExternalLink className="h-5 w-5" />}
          label="문의하기"
          href={`https://t.me/${SITE.support.telegram.replace("@", "")}`}
        />
      </div>

      <div className="mx-4 mt-4 rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}>
        <MenuItem icon={<LogOut className="h-5 w-5" />} label="로그아웃" danger onClick={handleLogout} />
      </div>
    </div>
  );
}