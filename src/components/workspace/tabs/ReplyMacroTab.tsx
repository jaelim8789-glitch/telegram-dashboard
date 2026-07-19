"use client";

import { useState } from "react";
import { SendHorizonal, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { getAccountDisplayName } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export function ReplyMacroTab() {
  const accounts = useDashboardStore((s) => s.accounts);
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const account = accounts.find((a) => a.id === selectedAccountId);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const { toast } = useToast();

  async function handleRandomReply() {
    if (!selectedAccountId) return;
    setRunning(true);
    setResult(null);

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/api/accounts/${selectedAccountId}/reply-macros/random-reply`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setResult("completed");
        toast("success", `랜덤 답장 완료 (${data.results?.length || 0}개 채팅방)`);
      } else {
        setResult("failed");
        toast("error", data.detail || "실패");
      }
    } catch {
      setResult("failed");
      toast("error", "네트워크 오류");
    } finally {
      setRunning(false);
    }
  }

  if (!account) {
    return (
      <Panel title="랜덤 답장">
        <p className="text-sm text-app-text-muted">사이드바에서 계정을 선택하세요</p>
      </Panel>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6 pb-8 pt-8 text-center">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-app-text">랜덤 답장</h2>
        <p className="text-sm text-app-text-muted">{getAccountDisplayName(account)}</p>
        <p className="text-xs text-app-text-muted">
          모든 대상 채팅방의 최근 메시지 중 무작위 1명을 선택하여 답장으로 홍보글을 전송합니다.
          같은 사람에게 중복 전송되지 않습니다.
        </p>
      </div>

      <Button
        variant="primary"
        size="lg"
        onClick={handleRandomReply}
        loading={running}
        disabled={running}
        className="w-full max-w-xs mx-auto"
      >
        {running ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> 실행 중...</>
        ) : (
          <><SendHorizonal className="h-4 w-4" /> 랜덤 답장 실행</>
        )}
      </Button>

      {result === "completed" && (
        <div className="flex items-center justify-center gap-2 text-sm text-app-success">
          <CheckCircle2 className="h-4 w-4" /> 완료
        </div>
      )}
      {result === "failed" && (
        <div className="flex items-center justify-center gap-2 text-sm text-app-danger">
          <XCircle className="h-4 w-4" /> 실패
        </div>
      )}
    </div>
  );
}