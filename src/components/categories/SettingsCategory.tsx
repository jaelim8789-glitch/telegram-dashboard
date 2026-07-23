"use client";

import { useState, useCallback } from "react";
import {
  Settings,
  User,
  Key,
  Palette,
  Bell,
  Globe,
  Shield,
  Database,
  Webhook,
  HelpCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";

const ApiKeyManagerTab = dynamic(
  () => import("@/components/workspace/tabs/ApiKeyManagerTab").then((m) => ({ default: m.ApiKeyManagerTab })),
  {
    loading: () => (
      <div className="space-y-3 p-4">
        <div className="h-6 w-1/3 animate-pulse rounded bg-app-border" />
        <div className="h-64 animate-pulse rounded-xl bg-app-border" />
      </div>
    ),
  },
);

const WebhookSettingsTab = dynamic(
  () => import("@/components/workspace/tabs/WebhookSettingsTab").then((m) => ({ default: m.WebhookSettingsTab })),
  {
    loading: () => (
      <div className="space-y-3 p-4">
        <div className="h-6 w-1/3 animate-pulse rounded bg-app-border" />
        <div className="h-64 animate-pulse rounded-xl bg-app-border" />
      </div>
    ),
  },
);

interface SettingsItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const SETTINGS_MENU: SettingsItem[] = [
  { id: "account", label: "계정", icon: User, description: "프로필 및 계정 정보" },
  { id: "api-keys", label: "API 키", icon: Key, description: "API 인증 키 관리" },
  { id: "theme", label: "테마", icon: Palette, description: "UI 테마 설정" },
  { id: "notifications", label: "알림", icon: Bell, description: "알림 환경설정" },
  { id: "language", label: "언어/지역", icon: Globe, description: "언어 및 시간대" },
  { id: "security", label: "보안", icon: Shield, description: "보안 설정" },
  { id: "data", label: "데이터", icon: Database, description: "데이터 관리" },
  { id: "webhooks", label: "웹훅", icon: Webhook, description: "웹훅 설정" },
  { id: "help", label: "도움말", icon: HelpCircle, description: "도움말 및 지원" },
];

function SettingsFormPlaceholder({ label, description }: { label: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <Settings className="h-12 w-12 text-app-text-subtle mb-3" />
      <h3 className="text-base font-semibold text-app-text mb-1">{label}</h3>
      <p className="text-sm text-app-text-muted max-w-xs">{description}</p>
      <p className="mt-4 text-xs text-app-text-subtle">설정 페이지 준비 중</p>
    </div>
  );
}

export function SettingsCategory({ panel }: { panel: "left" | "center" | "right" }) {
  const [selectedSetting, setSelectedSetting] = useState<string>("account");

  if (panel === "left") {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-app-border px-4 py-3">
          <h2 className="text-sm font-semibold text-app-text">설정</h2>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {SETTINGS_MENU.map((item) => {
            const Icon = item.icon;
            const isSelected = selectedSetting === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedSetting(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                  isSelected
                    ? "bg-app-primary/10 text-app-primary"
                    : "text-app-text-muted hover:text-app-text hover:bg-app-card",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-[11px] text-app-text-subtle truncate">{item.description}</div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>
    );
  }

  if (panel === "center") {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-app-border bg-app-surface px-4 py-2">
          <h3 className="text-xs font-medium text-app-text-muted">
            {SETTINGS_MENU.find((s) => s.id === selectedSetting)?.label ?? "설정"}
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {selectedSetting === "api-keys" && (
            <div className="p-4">
              <ApiKeyManagerTab />
            </div>
          )}
          {selectedSetting === "webhooks" && (
            <div className="p-4">
              <WebhookSettingsTab />
            </div>
          )}
          {selectedSetting === "account" && (
            <SettingsFormPlaceholder
              label="계정 설정"
              description="프로필 정보, 비밀번호 변경, 계정 연결을 관리합니다."
            />
          )}
          {selectedSetting === "theme" && (
            <SettingsFormPlaceholder
              label="테마 설정"
              description="라이트/다크 모드, 색상 테마, 폰트 크기를 조정합니다."
            />
          )}
          {selectedSetting === "notifications" && (
            <SettingsFormPlaceholder
              label="알림 설정"
              description="푸시 알림, 이메일 알림, 브라우저 알림을 관리합니다."
            />
          )}
          {selectedSetting === "language" && (
            <SettingsFormPlaceholder
              label="언어/지역 설정"
              description="표시 언어, 시간대, 날짜 형식을 설정합니다."
            />
          )}
          {selectedSetting === "security" && (
            <SettingsFormPlaceholder
              label="보안 설정"
              description="2단계 인증, 세션 관리, 접근 제어를 설정합니다."
            />
          )}
          {selectedSetting === "data" && (
            <SettingsFormPlaceholder
              label="데이터 관리"
              description="데이터 내보내기, 백업, 저장소를 관리합니다."
            />
          )}
          {selectedSetting === "help" && (
            <SettingsFormPlaceholder
              label="도움말"
              description="자주 묻는 질문, 문서, 고객 지원을 확인합니다."
            />
          )}
        </div>
      </div>
    );
  }

  return null;
}
