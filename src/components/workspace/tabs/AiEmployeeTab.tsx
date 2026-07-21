"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bot, MessageCircle, Settings, Users, Clock,
  Loader2, RefreshCw, CheckCircle2, XCircle, FileText,
  Save, Plus, Trash2,
} from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { InlineError } from "@/components/ui/InlineError";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/ui/Toast";
import { getToken, getSessionToken } from "@/lib/auth";
import { AiSubTabLayout } from "@/components/ai/AiSubTabLayout";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  const sessionToken = getSessionToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (sessionToken) headers["X-Session-Token"] = sessionToken;
  return headers;
}

// ── Scheduled Message ────────────────────────────────────────────────

interface ScheduledMessage {
  id: string;
  chat_id: number;
  text: string;
  status: string;
  send_at: string;
  created_at: string;
  sent_at: string | null;
  error_message: string | null;
}

const STATUS_BADGE: Record<string, { tone: "info" | "success" | "danger" | "warning"; label: string }> = {
  pending: { tone: "info", label: "대기" },
  sent: { tone: "success", label: "발송" },
  failed: { tone: "danger", label: "실패" },
  cancelled: { tone: "warning", label: "취소" },
};

export function AiEmployeeTab() {
  const [activeSub, setActiveSub] = useState<"groups" | "messages" | "commands">("groups");
  const { toast } = useToast();

  return (
    <div className="space-y-4">
      {/* Sub-navigation */}
      <div className="flex flex-wrap gap-1.5">
        {[
          { id: "groups", label: "그룹 설정", icon: Users },
          { id: "messages", label: "예약 메시지", icon: Clock },
          { id: "commands", label: "커스텀 명령어", icon: FileText },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSub(tab.id as typeof activeSub)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              activeSub === tab.id
                ? "bg-app-primary text-white shadow-sm"
                : "bg-app-card border border-app-border text-app-text-muted hover:bg-app-card-hover"
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeSub === "groups" && <GroupSettings />}
      {activeSub === "messages" && <ScheduledMessages />}
      {activeSub === "commands" && <CustomCommands />}
    </div>
  );
}

// ── Group Settings ──────────────────────────────────────────────────

function GroupSettings() {
  const [chatId, setChatId] = useState("");
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [styleProfileId, setStyleProfileId] = useState("default");
  const [availableActions, setAvailableActions] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function handleLoadProfile() {
    if (!chatId.trim()) return;
    setLoadingProfile(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/bot/ai/style-profile/${chatId.trim()}`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setStyleProfileId(data.style_profile_id || "default");
        setAvailableActions((data.available_actions || []).join(", "));
      } else {
        setError("프로필을 불러올 수 없습니다.");
        setProfile(null);
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoadingProfile(false);
    }
  }

  async function handleSaveProfile() {
    if (!chatId.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const actions = availableActions
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);

      const res = await fetch(`${BASE_URL}/api/bot/ai/style-profile/${chatId.trim()}`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          style_profile_id: styleProfileId,
          available_actions: actions.length > 0 ? actions : undefined,
        }),
      });

      if (res.ok) {
        toast("success", `그룹 ${chatId} 스타일 프로필이 저장되었습니다.`);
        await handleLoadProfile();
      } else {
        setError("프로필 저장에 실패했습니다.");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AiSubTabLayout
      icon={<Settings className="h-5 w-5 text-app-primary" />}
      title="그룹 AI 설정"
      subtitle="그룹별 Employee Mode 설정"
      error={error || undefined}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Chat ID 입력 */}
        <Panel title="그룹 조회">
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-app-text-muted">그룹 Chat ID</label>
              <input
                type="number"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="-1001234567890"
                className="mt-1 w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-xs text-app-text outline-none focus:border-app-primary"
              />
            </div>
            <Button variant="primary" size="sm" onClick={handleLoadProfile} loading={loadingProfile} disabled={!chatId.trim()}>
              조회
            </Button>
          </div>
        </Panel>

        {/* 프로필 설정 */}
        <Panel title="스타일 프로필">
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-app-text-muted">Style Profile ID</label>
              <input
                value={styleProfileId}
                onChange={(e) => setStyleProfileId(e.target.value)}
                placeholder="default"
                className="mt-1 w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-xs text-app-text outline-none focus:border-app-primary"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-app-text-muted">사용 가능 액션 (쉼표 구분)</label>
              <textarea
                value={availableActions}
                onChange={(e) => setAvailableActions(e.target.value)}
                placeholder="번역, 요약, 날씨, 뉴스, 도움말"
                rows={3}
                className="mt-1 w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-xs text-app-text outline-none focus:border-app-primary resize-none"
              />
            </div>
            <Button variant="primary" size="sm" onClick={handleSaveProfile} loading={saving} disabled={saving}>
              <Save className="h-3.5 w-3.5" /> 저장
            </Button>
          </div>
        </Panel>

        {/* 현재 프로필 정보 */}
        {profile && (
          <Panel title={`현재 설정 (Chat ID: ${chatId})`} className="lg:col-span-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border border-app-border bg-app-bg p-2.5">
                <div className="text-[10px] text-app-text-muted">Style Profile</div>
                <div className="text-sm font-semibold text-app-text mt-0.5">
                  {String(profile.style_profile_id || "default")}
                </div>
              </div>
              <div className="rounded-lg border border-app-border bg-app-bg p-2.5">
                <div className="text-[10px] text-app-text-muted">설정됨</div>
                <div className="text-sm font-semibold text-app-text mt-0.5">
                  {profile.configured ? (
                    <span className="text-app-success">✅</span>
                  ) : (
                    <span className="text-app-text-subtle">❌</span>
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-app-border bg-app-bg p-2.5 sm:col-span-2">
                <div className="text-[10px] text-app-text-muted">액션</div>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {((profile.available_actions as string[]) || []).map((action: string) => (
                    <Badge key={action} tone="neutral">{action}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        )}
      </div>
    </AiSubTabLayout>
  );
}

// ── Scheduled Messages ──────────────────────────────────────────────

function ScheduledMessages() {
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      params.set("limit", "50");
      const res = await fetch(`${BASE_URL}/api/bot/ai/scheduled-messages?${params.toString()}`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      } else {
        setError("예약 메시지를 불러올 수 없습니다.");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function handleCancel(id: string) {
    setCancelling(id);
    try {
      const res = await fetch(`${BASE_URL}/api/bot/ai/scheduled-messages/${id}/cancel`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (res.ok) {
        toast("success", "예약 메시지가 취소되었습니다.");
        load();
      } else {
        toast("error", "취소에 실패했습니다.");
      }
    } catch {
      toast("error", "네트워크 오류가 발생했습니다.");
    } finally {
      setCancelling(null);
    }
  }

  const FILTERS = [null, "pending", "sent", "failed", "cancelled"] as const;
  const FILTER_LABEL: Record<string, string> = {
    pending: "대기", sent: "발송", failed: "실패", cancelled: "취소",
  };

  return (
    <AiSubTabLayout
      icon={<Clock className="h-5 w-5 text-app-primary" />}
      title="예약 메시지"
      subtitle="AiEmployee 예약 발송 목록"
      loading={loading}
      error={error || undefined}
      empty={!loading && !error && messages.length === 0}
      emptyFallback={
        <div className="flex flex-col items-center gap-2 text-app-text-muted">
          <Clock className="h-8 w-8 opacity-30" />
          <p className="text-xs">예약된 메시지가 없습니다.</p>
        </div>
      }
    >
      {/* Status filters */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f || "all"}
            onClick={() => setStatusFilter(f)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              statusFilter === f
                ? "bg-app-primary text-white"
                : "bg-app-card-hover text-app-text-muted hover:text-app-text"
            )}
          >
            {f ? FILTER_LABEL[f] || f : "전체"}
          </button>
        ))}
      </div>

      {/* Message list */}
      <div className="space-y-2">
        {messages.map((msg) => {
          const badge = STATUS_BADGE[msg.status] || { tone: "neutral" as const, label: msg.status };
          return (
            <div
              key={msg.id}
              className="flex items-start gap-3 rounded-xl border border-app-border bg-app-card p-3 text-xs"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge tone={badge.tone as "info" | "success" | "danger" | "warning" | "neutral"}>
                    {badge.label}
                  </Badge>
                  <span className="text-app-text-muted">Chat: {msg.chat_id}</span>
                </div>
                <p className="text-app-text truncate whitespace-pre-wrap line-clamp-2">{msg.text}</p>
                <div className="flex gap-3 mt-1.5 text-[10px] text-app-text-muted">
                  <span>예약: {new Date(msg.send_at).toLocaleString("ko-KR")}</span>
                  {msg.created_at && <span>생성: {new Date(msg.created_at).toLocaleString("ko-KR")}</span>}
                  {msg.error_message && <span className="text-app-danger">오류: {msg.error_message}</span>}
                </div>
              </div>
              {msg.status === "pending" && (
                <button
                  onClick={() => handleCancel(msg.id)}
                  disabled={cancelling === msg.id}
                  className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-app-warning hover:bg-app-warning-muted transition-colors disabled:opacity-40"
                  title="취소"
                >
                  {cancelling === msg.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </AiSubTabLayout>
  );
}

// ── Custom Commands ─────────────────────────────────────────────────

function CustomCommands() {
  const [commands, setCommands] = useState<{ name: string; system_prompt: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/bot/ai/scheduled-messages?limit=1`, { headers: authHeaders() });
      // Custom commands are loaded through the guest engine
      // For now we show a message about how to register them
      setCommands([]);
    } catch {
      setError("명령어 목록을 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <AiSubTabLayout
      icon={<FileText className="h-5 w-5 text-app-primary" />}
      title="커스텀 명령어"
      subtitle="Guest Bot / AiEmployee 동적 명령어"
      loading={loading}
      error={error || undefined}
      empty={!loading && !error && commands.length === 0}
      emptyFallback={
        <div className="flex flex-col items-center gap-2 text-app-text-muted">
          <FileText className="h-8 w-8 opacity-30" />
          <p className="text-xs">등록된 커스텀 명령어가 없습니다.</p>
          <p className="text-[10px] text-center max-w-xs">
            텔레그램에서 @TeleMonBot 등록 [이름] [프롬프트] 로<br />
            새로운 명령어를 등록할 수 있습니다.
          </p>
        </div>
      }
    >
      <Panel title="등록 방법">
        <div className="space-y-2 text-xs text-app-text-muted">
          <p>텔레그램에서 @TeleMonBot 에게 다음 형식으로 메시지를 보내세요:</p>
          <code className="block rounded-lg border border-app-border bg-app-bg px-3 py-2 text-[11px] text-app-text">
            @TeleMonBot 등록 [명령어이름] [시스템 프롬프트]
          </code>
          <p className="text-[10px]">예: <code className="text-app-primary">@TeleMonBot 등록 맞춤법 한국어 맞춤법을 검사하고 수정해줘</code></p>
        </div>
      </Panel>
    </AiSubTabLayout>
  );
}
