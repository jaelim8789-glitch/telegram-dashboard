"use client";

import { useState, memo, useEffect, useCallback, useMemo, useRef } from "react";
import { Send, Loader2, CheckCircle, Clock, History, Users, ChevronDown, AlertCircle, Trash2, Calendar, Copy, Info } from "lucide-react";
import { hapticFeedback } from "@tma.js/sdk-react";
import * as api from "@/lib/api";
import { quickSendToTopGroups } from "@/lib/api-miniapp";
import { useToastStore } from "@/components/ui/GlobalToast";
import { useAutoDraft } from "@/hooks/useAutoDraft";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { ConfirmAction, useConfirmAction } from "@/components/ui/ConfirmAction";
import { SuccessPredictorBadge } from "@/hooks/useSuccessPredictor";

interface MiniAppSendProps { user?: { id: number; first_name?: string; last_name?: string; username?: string }; }

const MAX_CHARS = 4096;

export const MiniAppSend = memo(function MiniAppSend({ user }: MiniAppSendProps) {
  const toast = useToastStore(s => s.add);
  const { confirm, ConfirmDialog } = useConfirmAction();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [accounts, setAccounts] = useState<{ id: string; phone: string }[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [groups, setGroups] = useState<{ id: string; title: string }[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [loadingAccts, setLoadingAccts] = useState(true);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draft = useAutoDraft("miniapp-send-message");

  useEffect(() => {
    const saved = draft.restore();
    if (saved) setMessage(saved);
    api.fetchAccounts().then(list => {
      const active = list.filter((a: any) => a.status === "active").map((a: any) => ({ id: a.id, phone: a.phone }));
      setAccounts(active);
      if (active.length > 0) setSelectedAccountIds([active[0].id]);
      setLoadingAccts(false);
    }).catch(() => setLoadingAccts(false));
  }, []);

  useEffect(() => {
    const aid = selectedAccountIds[0];
    if (!aid) return;
    api.fetchGroups(aid).then((list: any[]) => setGroups(list || [])).catch(() => setGroups([]));
  }, [selectedAccountIds]);

  const handleSend = useCallback(async () => {
    if (!message.trim() || sending || selectedAccountIds.length === 0) return;
    setSending(true); setError("");
    let success = 0, failed = 0;
    for (const accountId of selectedAccountIds) {
      try {
        if (selectedGroupIds.length > 0) {
          const { request } = await import("@/lib/api");
          await request("/api/broadcasts", { method: "POST", body: JSON.stringify({ account_id: accountId, message: message.trim(), group_ids: selectedGroupIds, delivery_mode: "normal" }) });
        } else {
          const result = await quickSendToTopGroups(accountId, message.trim(), 5);
          if (!result.success) throw new Error(result.message);
        }
        success++;
      } catch { failed++; }
    }
    setSending(false);
    if (failed === 0) { setSent(true); draft.clearDraft(); toast({ type: "success", title: "발송 완료", message: `${success}개 계정 발송 성공` }); setTimeout(() => setSent(false), 3000); }
    else { setError(`${success}건 성공, ${failed}건 실패`); try { hapticFeedback.notificationOccurred("error"); } catch {} }
  }, [message, sending, selectedAccountIds, selectedGroupIds, toast, draft]);

  useKeyboardShortcut("Enter", handleSend, { ctrl: true });

  const toggleAccount = useCallback((id: string) => setSelectedAccountIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]), []);
  const toggleGroup = useCallback((id: string) => setSelectedGroupIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]), []);

  const remaining = MAX_CHARS - message.length;
  const remainingColor = remaining > 500 ? "var(--tg-theme-hint-color)" : remaining > 100 ? "#f59e0b" : "#ef4444";

  return (
    <div className="p-4 pb-8 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ color: "var(--tg-theme-text-color)" }}>발송</p>
        <SuccessPredictorBadge text={message} />
      </div>

      {/* 계정 선택 */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium flex items-center gap-1" style={{ color: "var(--tg-theme-hint-color)" }}><Users className="h-3 w-3" /> 계정 ({selectedAccountIds.length}개)</label>
        {loadingAccts ? <div className="h-10 rounded-xl animate-pulse" style={{ backgroundColor: "var(--tg-theme-secondary-bg-color)" }} /> : (
          <div className="flex flex-wrap gap-1.5">
            {accounts.map(a => (
              <button key={a.id} onClick={() => toggleAccount(a.id)}
                className="rounded-full px-3 py-2 text-[11px] font-medium active:scale-95"
                style={{ backgroundColor: selectedAccountIds.includes(a.id) ? "var(--tg-theme-button-color, #5288c1)" : "var(--tg-theme-secondary-bg-color, #232e3c)", color: selectedAccountIds.includes(a.id) ? "#fff" : "var(--tg-theme-text-color)" }}>
                {a.phone}
              </button>
            ))}
          </div>
        )}
        {accounts.length === 0 && !loadingAccts && (
          <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)", color: "var(--tg-theme-hint-color)" }}>
            <Info className="h-3.5 w-3.5" /> 활성 계정이 없습니다. 프로필 탭에서 계정을 연결하세요.
          </div>
        )}
      </div>

      {/* 그룹 선택 */}
      <div>
        <button onClick={() => setShowGroupPicker(!showGroupPicker)} className="flex items-center justify-between w-full rounded-xl px-4 py-3 text-sm active:scale-[0.98]"
          style={{ backgroundColor: "var(--tg-theme-secondary-bg-color, #232e3c)", color: "var(--tg-theme-text-color)" }}>
          <span>{selectedGroupIds.length > 0 ? `${selectedGroupIds.length}개 그룹 선택됨` : "그룹 선택 (선택사항)"}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showGroupPicker ? "rotate-180" : ""}`} style={{ color: "var(--tg-theme-hint-color, #708499)" }} />
        </button>
        {showGroupPicker && (
          <div className="mt-1 max-h-40 overflow-y-auto rounded-xl p-2" style={{ backgroundColor: "var(--tg-theme-secondary-bg-color, #232e3c)" }}>
            {groups.length === 0 ? (
              <p className="text-xs py-3 text-center" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>그룹이 없습니다</p>
            ) : groups.map(g => (
              <button key={g.id} onClick={() => toggleGroup(g.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs ${selectedGroupIds.includes(g.id) ? "font-semibold" : ""}`}
                style={{ backgroundColor: selectedGroupIds.includes(g.id) ? "var(--tg-theme-button-color, #5288c1)" : "transparent", color: selectedGroupIds.includes(g.id) ? "#fff" : "var(--tg-theme-text-color)" }}>
                <span className={`flex h-2 w-2 rounded-full ${selectedGroupIds.includes(g.id) ? "bg-white" : "bg-gray-500"}`} />
                {g.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 메시지 */}
      <div className="relative">
        <textarea ref={textareaRef} value={message} onChange={e => { setMessage(e.target.value); draft.onChange(e.target.value); }}
          placeholder="보낼 메시지를 입력하세요..." rows={5} maxLength={MAX_CHARS}
          style={{ backgroundColor: "var(--tg-theme-secondary-bg-color, #232e3c)", color: "var(--tg-theme-text-color)" }}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none" aria-label="발송 메시지" />
        <div className="absolute bottom-2 right-3 text-[10px] font-medium" style={{ color: remainingColor }}>{remaining}</div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: "var(--tg-theme-destructive-text-color, #ec3942)" }}>
          <AlertCircle className="h-3.5 w-3.5 text-white" /><span className="text-white">{error}</span>
        </div>
      )}

      <button onClick={() => confirm("발송 확인", handleSend, `${selectedAccountIds.length}개 계정 · ${selectedGroupIds.length || "상위 5"}개 그룹으로 발송합니다`)}
        disabled={!message.trim() || sending || selectedAccountIds.length === 0}
        style={{ backgroundColor: "var(--tg-theme-button-color, #5288c1)", color: "#fff" }}
        className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-4 text-sm font-semibold disabled:opacity-50 active:scale-[0.98]"
        aria-label={sending ? "발송 중" : sent ? "발송 완료" : "발송하기"}>
        {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : sent ? <CheckCircle className="h-5 w-5" /> : <Send className="h-5 w-5" />}
        {sending ? "발송 중..." : sent ? "발송 완료!" : `발송 (${selectedAccountIds.length}개 계정)`}
      </button>

      {selectedGroupIds.length === 0 && (
        <p className="text-xs text-center" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>그룹을 선택하지 않으면 상위 5개 그룹에 자동 발송됩니다</p>
      )}
      {ConfirmDialog}
    </div>
  );
});
