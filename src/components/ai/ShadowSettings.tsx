"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Clock, Shield, ToggleLeft, ToggleRight, Volume2, VolumeX, Bot } from "lucide-react";
import type { ShadowSettings } from "@/hooks/useAiShadow";
import { cn } from "@/lib/cn";

const STORAGE_KEY = "telemon-shadow-settings";

const DEFAULT_SETTINGS: ShadowSettings = {
  enabled: true,
  watchMinutes: 20,
  notificationSound: false,
  autoReply: false,
};

function loadSettings(): ShadowSettings {
  if (typeof localStorage === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(s: ShadowSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

const WATCH_OPTIONS = [
  { value: 5, label: "5분" },
  { value: 10, label: "10분" },
  { value: 15, label: "15분" },
  { value: 20, label: "20분" },
  { value: 30, label: "30분" },
  { value: 45, label: "45분" },
  { value: 60, label: "60분" },
];

export function ShadowSettings() {
  const [settings, setSettings] = useState<ShadowSettings>(loadSettings);

  const update = (partial: Partial<ShadowSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    saveSettings(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
          <Shield className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-app-text">AI Shadow</p>
          <p className="text-[11px] text-app-text-muted">
            고객 응답이 없을 때 AI가 먼저 답장을 제안합니다
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-app-border/50 bg-app-card divide-y divide-app-border/30">
        <ToggleRow
          icon={settings.enabled ? <ToggleRight className="h-4 w-4 text-app-primary" /> : <ToggleLeft className="h-4 w-4 text-app-text-muted" />}
          label="Shadow 활성화"
          description="켜면 고객 메시지 감시를 시작합니다"
          checked={settings.enabled}
          onChange={(v) => update({ enabled: v })}
        />

        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Clock className="h-4 w-4 shrink-0 text-app-text-muted" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-app-text">감시 시간</p>
              <p className="text-[10px] text-app-text-muted">
                고객 메시지 후 AI가 개입하기까지 대기 시간
              </p>
            </div>
          </div>
          <select
            value={settings.watchMinutes}
            onChange={(e) => update({ watchMinutes: Number(e.target.value) })}
            className="rounded-lg border border-app-border bg-app-card-hover px-2 py-1.5 text-xs text-app-text focus:outline-none focus:border-app-primary/50"
          >
            {WATCH_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <ToggleRow
          icon={settings.notificationSound ? <Volume2 className="h-4 w-4 text-app-text" /> : <VolumeX className="h-4 w-4 text-app-text-muted" />}
          label="알림음"
          description="Shadow 알림 도착 시 소리 재생"
          checked={settings.notificationSound}
          onChange={(v) => update({ notificationSound: v })}
        />

        <ToggleRow
          icon={settings.autoReply ? <Bot className="h-4 w-4 text-app-primary" /> : <Bot className="h-4 w-4 text-app-text-muted" />}
          label="자동 답장"
          description="AI가 자동으로 답장을 전송 (제안만 할지, 바로 보낼지)"
          checked={settings.autoReply}
          onChange={(v) => update({ autoReply: v })}
        />
      </div>

      {settings.autoReply && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <p className="text-[11px] text-amber-400 font-medium">
            자동 답장이 활성화되었습니다
          </p>
          <p className="text-[10px] text-amber-400/70 mt-0.5">
            AI가 고객 메시지를 분석하여 자동으로 답장을 전송합니다. 신중하게 사용하세요.
          </p>
        </div>
      )}
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-2.5 min-w-0">
        {icon}
        <div className="min-w-0">
          <p className="text-xs font-medium text-app-text">{label}</p>
          <p className="text-[10px] text-app-text-muted">{description}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-app-primary" : "bg-app-border-strong"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform",
            checked && "translate-x-4"
          )}
        />
      </button>
    </div>
  );
}
