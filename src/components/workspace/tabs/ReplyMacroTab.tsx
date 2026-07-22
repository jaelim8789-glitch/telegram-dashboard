"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { getToken } from "@/lib/auth";
import { getAccountDisplayName } from "@/types";
import { WatermarkGate } from "@/components/workspace/WatermarkGate";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

function authHeaders(): Record<string, string> {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function ReplyMacroTab() {
  const accounts = useDashboardStore((s) => s.accounts);
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const plan = useDashboardStore((s) => s.plan);
  const account = accounts.find((a) => a.id === selectedAccountId);
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!selectedAccountId) return;
    setLoading(true);
    fetch(`${API_BASE}/api/accounts/${selectedAccountId}/reply-macros/toggle`, {
      headers: authHeaders(),
    })
      .then((r) => r.json())
      .then((data) => {
        setIsActive(!!data.is_active);
        setMessage(data.message_content || "");
      })
      .catch(() => { toast("error", "로드 실패"); })
      .finally(() => setLoading(false));
  }, [selectedAccountId]);

  async function saveToggle(nextActive: boolean) {
    if (!selectedAccountId || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/accounts/${selectedAccountId}/reply-macros/toggle`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ is_active: nextActive, message_content: message }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast("error", data.detail || "저장 실패");
        return;
      }
      setIsActive(!!data.is_active);
      toast("success", data.is_active ? "랜덤 답장 켜짐 — 모든 그룹에 자동으로 나갑니다" : "랜덤 답장 꺼짐");
    } catch {
      toast("error", "네트워크 오류");
    } finally {
      setSaving(false);
    }
  }

  if (!account) {
    return (
      <Panel title="랜덤 답장">
        <p className="text-sm text-app-text-muted">사이드바에서 계정을 선택하세요</p>
      </Panel>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center pt-16">
        <Loader2 className="h-5 w-5 animate-spin text-app-text-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6 pb-8 pt-8">
      <div className="space-y-1 text-center">
        <h2 className="text-lg font-semibold text-app-text">랜덤 답장</h2>
        <p className="text-sm text-app-text-muted">{getAccountDisplayName(account)}</p>
        <p className="text-xs text-app-text-muted">
          켜면 이 계정이 속한 모든 그룹에서 무작위로 1명씩 골라 답장으로 아래 메시지를 자동 전송합니다.
          같은 사람에게 중복 전송되지 않으며, 약 {30}분마다 반복됩니다.
        </p>
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="답장으로 보낼 메시지를 입력하세요"
        rows={5}
        disabled={saving}
        className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 text-sm outline-none focus:border-app-primary focus:ring-1 focus:ring-app-primary/30 resize-none"
      />

      {/* Watermark + Referral Gate — free plan users must enable watermark */}
      <WatermarkGate plan={plan} />

      <div className="flex items-center justify-between rounded-xl border border-app-border bg-app-card px-4 py-3">
        <span className="text-sm font-medium text-app-text">
          {isActive ? "켜짐 — 자동 실행 중" : "꺼짐"}
        </span>
        <Button
          variant={isActive ? "secondary" : "primary"}
          size="sm"
          loading={saving}
          disabled={saving || (!isActive && !message.trim())}
          onClick={() => saveToggle(!isActive)}
        >
          {isActive ? "끄기" : "켜기"}
        </Button>
      </div>
    </div>
  );
}
