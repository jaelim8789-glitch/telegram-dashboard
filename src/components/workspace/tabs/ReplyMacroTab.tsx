"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Loader2, MessageSquare, AlertTriangle } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { getAccountDisplayName, type ReplyMacro } from "@/types";
import { fetchReplyMacros, updateReplyMacro } from "@/lib/api";

export function ReplyMacroTab() {
  const { selectedAccountId, accounts } = useDashboardStore();
  const { toast } = useToast();
  const [macros, setMacros] = useState<ReplyMacro[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState("");

  const account = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId),
    [accounts, selectedAccountId]
  );

  // 이 탭은 "랜덤 답장" 단일 매크로 개념으로 동작 — 계정당 매크로가 없으면 새로
  // 만들 준비 상태를, 있으면 첫 번째 매크로를 편집 대상으로 삼는다.
  const macro = macros[0] ?? null;

  useEffect(() => {
    if (!selectedAccountId) return;

    const currentAccount = accounts.find((acc) => acc.id === selectedAccountId);
    if (currentAccount?.status !== "active") {
      setMacros([]);
      setLoading(false);
      return;
    }

    loadMacros();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId, accounts]);

  useEffect(() => {
    setDraftMessage(macro?.messageContent ?? "");
  }, [macro]);

  async function loadMacros() {
    setLoading(true);
    setError(null);
    try {
      const currentAccount = accounts.find((acc) => acc.id === selectedAccountId);
      if (currentAccount?.status !== "active") {
        throw new Error("계정이 인증되지 않아 답장매크로를 불러올 수 없습니다.");
      }

      const data = await fetchReplyMacros(selectedAccountId!);
      setMacros(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "답장매크로 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function saveToggle(nextActive: boolean) {
    if (!selectedAccountId || !macro) return;

    const currentAccount = accounts.find((acc) => acc.id === selectedAccountId);
    if (currentAccount?.status !== "active") {
      toast("error", "계정이 인증되지 않아 답장매크로를 사용할 수 없습니다. 계정 등록에서 Telegram 인증을 완료해주세요.");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateReplyMacro(selectedAccountId, macro.id, { isActive: nextActive });
      setMacros((prev) => prev.map((m) => (m.id === macro.id ? updated : m)));
      toast("success", nextActive ? "답장매크로 켜짐" : "답장매크로 꺼짐");
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  async function saveMessage() {
    if (!selectedAccountId || !macro) return;

    const currentAccount = accounts.find((acc) => acc.id === selectedAccountId);
    if (currentAccount?.status !== "active") {
      toast("error", "계정이 인증되지 않아 답장매크로를 수정할 수 없습니다. 계정 등록에서 Telegram 인증을 완료해주세요.");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateReplyMacro(selectedAccountId, macro.id, { messageContent: draftMessage });
      setMacros((prev) => prev.map((m) => (m.id === macro.id ? updated : m)));
      toast("success", "메시지 저장됨");
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  if (!selectedAccountId) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div>
          <MessageSquare className="mx-auto h-12 w-12 text-app-text-subtle" />
          <h3 className="mt-3 text-lg font-medium text-app-text">계정을 선택하세요</h3>
          <p className="mt-1 text-sm text-app-text-secondary">
            왼쪽 사이드바에서 계정을 선택한 후 답장매크로를 설정할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div>
          <MessageSquare className="mx-auto h-12 w-12 text-app-text-subtle" />
          <h3 className="mt-3 text-lg font-medium text-app-text">계정을 찾을 수 없습니다</h3>
          <p className="mt-1 text-sm text-app-text-secondary">
            선택한 계정이 존재하지 않습니다. 다른 계정을 선택해주세요.
          </p>
        </div>
      </div>
    );
  }

  if (account.status !== "active") {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="rounded-2xl border border-app-border bg-app-card p-6 max-w-md w-full">
          <MessageSquare className="mx-auto h-12 w-12 text-app-warning" />
          <h3 className="mt-3 text-lg font-medium text-app-text">계정 인증 필요</h3>
          <p className="mt-2 text-sm text-app-text-secondary">
            이 계정은 현재 {account.status === "inactive" ? "비활성화" :
            account.status === "banned" ? "차단" : "알 수 없는 상태"} 상태입니다.
          </p>
          <p className="mt-2 text-xs text-app-text-subtle">
            답장매크로를 사용하려면 계정 등록에서 Telegram 인증을 완료해야 합니다.
          </p>
          <Link href="/app" className="mt-4 inline-block">
            <Button variant="secondary" size="sm">
              계정 등록으로 이동
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div>
          <AlertTriangle className="mx-auto h-12 w-12 text-app-danger" />
          <h3 className="mt-3 text-lg font-medium text-app-text">오류 발생</h3>
          <p className="mt-1 text-sm text-app-text-secondary">{error}</p>
          <Button onClick={loadMacros} className="mt-4">
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center pt-16">
        <Loader2 className="h-5 w-5 animate-spin text-app-text-muted" />
      </div>
    );
  }

  const isActive = macro?.isActive ?? false;
  const messageDirty = macro !== null && draftMessage !== macro.messageContent;

  return (
    <div className="mx-auto max-w-md space-y-6 pb-8 pt-8">
      <div className="space-y-1 text-center">
        <h2 className="text-lg font-semibold text-app-text">랜덤 답장</h2>
        <p className="text-sm text-app-text-muted">{getAccountDisplayName(account)}</p>
        <p className="text-xs text-app-text-muted">
          켜면 이 계정이 속한 모든 그룹에서 무작위로 1명씩 골라 답장으로 아래 메시지를 자동 전송합니다.
          같은 사람에게 중복 전송되지 않으며, 약 30분마다 반복됩니다.
        </p>
      </div>

      <textarea
        value={draftMessage}
        onChange={(e) => setDraftMessage(e.target.value)}
        placeholder="답장으로 보낼 메시지를 입력하세요"
        rows={5}
        disabled={saving}
        className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 text-sm outline-none focus:border-app-primary focus:ring-1 focus:ring-app-primary/30 resize-none"
      />
      {messageDirty && (
        <Button variant="secondary" size="sm" loading={saving} onClick={saveMessage} className="w-full">
          메시지 저장
        </Button>
      )}

      <div className="flex items-center justify-between rounded-xl border border-app-border bg-app-card px-4 py-3">
        <span className="text-sm font-medium text-app-text">
          {isActive ? "켜짐 — 자동 실행 중" : "꺼짐"}
        </span>
        <Button
          variant={isActive ? "secondary" : "primary"}
          size="sm"
          loading={saving}
          disabled={saving || !macro || (!isActive && !draftMessage.trim())}
          onClick={() => saveToggle(!isActive)}
        >
          {isActive ? "끄기" : "켜기"}
        </Button>
      </div>
    </div>
  );
}
