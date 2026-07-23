"use client";

import { useState, type FormEvent } from "react";
import {
  ArrowDown, ArrowUp, ExternalLink, Globe, MessageSquare,
  Pin, Plus, RefreshCw, Send, Trash2,
} from "lucide-react";
import { motion } from "framer-motion";
import { Panel } from "@/components/ui/Panel";
import { Field, Textarea, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineError } from "@/components/ui/InlineError";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import * as api from "@/lib/api";

interface ChannelHubButton {
  id: string;
  label: string;
  url: string;
}

interface ChannelHubDraft {
  title: string;
  body: string;
  buttons: ChannelHubButton[];
  channelId: string;
  pinMessage: boolean;
}

let btnSeq = 0;
function nextBtnId(): string {
  return `btn-${++btnSeq}`;
}

function ChannelHubPreview({ draft }: { draft: ChannelHubDraft }) {
  const { title, body, buttons } = draft;

  if (!title && !body && buttons.every((b) => !b.label)) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <MessageSquare className="mb-3 h-8 w-8 text-app-text-subtle" />
        <p className="text-xs text-app-text-muted">내용을 입력하면 미리보기가 여기에 표시됩니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {title && <p className="text-sm font-bold text-app-text">{title}</p>}
      {body && <p className="text-xs text-app-text-secondary whitespace-pre-wrap leading-relaxed">{body}</p>}
      {buttons.length > 0 && (
        <div className="flex flex-col gap-2 pt-1">
          {buttons.map((btn) => (
            <a
              key={btn.id}
              href={btn.url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-center justify-center rounded-lg px-4 py-2 text-xs font-medium transition-colors",
                btn.url ? "bg-app-primary text-white hover:bg-app-primary-hover" : "bg-app-card-hover text-app-text-muted",
              )}
            >
              {btn.label || "(버튼 이름 없음)"}
              {btn.url && <ExternalLink className="ml-1.5 h-3 w-3" />}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChannelHubTab() {
  const accounts = useDashboardStore((s) => s.accounts);
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const { toast } = useToast();

  const account = accounts.find((a) => a.id === selectedAccountId);

  const [draft, setDraft] = useState<ChannelHubDraft>({
    title: "",
    body: "",
    buttons: [],
    channelId: "",
    pinMessage: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setTitle(value: string) { setDraft((d) => ({ ...d, title: value })); }
  function setBody(value: string) { setDraft((d) => ({ ...d, body: value })); }
  function setChannelId(value: string) { setDraft((d) => ({ ...d, channelId: value })); }
  function togglePin() { setDraft((d) => ({ ...d, pinMessage: !d.pinMessage })); }

  function addButton() {
    setDraft((d) => ({
      ...d,
      buttons: [...d.buttons, { id: nextBtnId(), label: "", url: "" }],
    }));
  }

  function removeButton(btnId: string) {
    setDraft((d) => ({
      ...d,
      buttons: d.buttons.filter((b) => b.id !== btnId),
    }));
  }

  function moveButton(btnId: string, direction: -1 | 1) {
    setDraft((d) => {
      const idx = d.buttons.findIndex((b) => b.id === btnId);
      if (idx < 0) return d;
      const nextIdx = idx + direction;
      if (nextIdx < 0 || nextIdx >= d.buttons.length) return d;
      const next = [...d.buttons];
      [next[idx], next[nextIdx]] = [next[nextIdx], next[idx]];
      return { ...d, buttons: next };
    });
  }

  function updateButton(id: string, field: "label" | "url", value: string) {
    setDraft((d) => ({
      ...d,
      buttons: d.buttons.map((b) => (b.id === id ? { ...b, [field]: value } : b)),
    }));
  }

  const canSubmit = draft.title.trim() && draft.channelId;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      await api.publishChannelPost({
        accountId: selectedAccountId!,
        channelId: draft.channelId.trim(),
        title: draft.title.trim(),
        body: draft.body.trim(),
        buttons: draft.buttons.filter((b) => b.label.trim() && b.url.trim()),
        pinMessage: draft.pinMessage,
      });
      toast("success", "채널에 성공적으로 발행되었습니다!");
      setDraft({ title: "", body: "", buttons: [], channelId: "", pinMessage: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "발행에 실패했습니다.";
      if (msg.includes("404") || msg.includes("Not Found") || msg.includes("not found")) {
        setError("채널 허브 API를 사용할 수 없습니다. 백엔드에서 /api/channel-hub/publish 엔드포인트가 활성화되어 있는지 확인하세요.");
      } else {
        setError(msg);
      }
      toast("error", msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (!accounts.length) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="연결된 계정이 없습니다"
        description="계정 등록 탭에서 먼저 Telegram 계정을 연결해주세요."
      />
    );
  }

  if (!account) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="계정을 선택해주세요"
        description="왼쪽 사이드바에서 채널 허브를 사용할 계정을 선택하세요."
      />
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <header>
        <h2 className="text-sm font-semibold text-app-text">채널 허브 빌더</h2>
        <p className="text-xs text-app-text-muted">
          버튼이 포함된 Telegram 채널 메시지를 작성하고 발행합니다.
        </p>
      </header>

      {error && <InlineError action={<button onClick={() => setError(null)} className="text-xs underline hover:no-underline">닫기</button>}>{error}</InlineError>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Editor */}
        <Panel
          title={<div className="flex items-center gap-2"><Send className="h-4 w-4 text-app-primary" /> 메시지 편집</div>}
          description="채널에 발행할 게시글을 작성하세요."
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="게시글 제목">
              <Input
                value={draft.title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="채널에 표시할 제목을 입력하세요."
              />
            </Field>

            <Field label="본문">
              <Textarea
                rows={6}
                value={draft.body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="본문 내용을 입력하세요. (선택사항)"
              />
            </Field>

            {/* Buttons */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-app-text-muted">인라인 버튼</span>
                <button
                  type="button"
                  onClick={addButton}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-app-primary hover:bg-app-primary-muted/20 transition-colors"
                >
                  <Plus className="h-3 w-3" /> 버튼 추가
                </button>
              </div>

              {draft.buttons.length === 0 && (
                <p className="text-[11px] text-app-text-subtle italic">
                  버튼이 없으면 일반 텍스트 메시지로 발행됩니다.
                </p>
              )}

              <div className="space-y-2">
                {draft.buttons.map((btn, idx) => (
                  <motion.div
                    key={btn.id}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className="rounded-xl border border-app-border bg-app-card/50 p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-medium text-app-text-muted uppercase tracking-wider">
                        버튼 {idx + 1}
                      </span>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveButton(btn.id, -1)}
                          disabled={idx === 0}
                          className="flex h-6 w-6 items-center justify-center rounded-md text-app-text-muted hover:text-app-text hover:bg-app-card-hover disabled:opacity-30 transition-colors"
                          aria-label="위로 이동"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveButton(btn.id, 1)}
                          disabled={idx === draft.buttons.length - 1}
                          className="flex h-6 w-6 items-center justify-center rounded-md text-app-text-muted hover:text-app-text hover:bg-app-card-hover disabled:opacity-30 transition-colors"
                          aria-label="아래로 이동"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeButton(btn.id)}
                          className="flex h-6 w-6 items-center justify-center rounded-md text-app-text-muted hover:text-app-danger hover:bg-app-danger-muted/20 transition-colors"
                          aria-label="버튼 삭제"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Field label="버튼 이름">
                        <Input
                          value={btn.label}
                          onChange={(e) => updateButton(btn.id, "label", e.target.value)}
                          placeholder="예: 자세히 보기"
                        />
                      </Field>
                      <Field label="연결 URL">
                        <Input
                          value={btn.url}
                          onChange={(e) => updateButton(btn.id, "url", e.target.value)}
                          placeholder="https://..."
                        />
                      </Field>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Channel selection */}
            <Field label="발행할 채널">
              <Input
                value={draft.channelId}
                onChange={(e) => setChannelId(e.target.value)}
                placeholder="채널 ID 또는 @username을 입력하세요."
              />
            </Field>

            {/* Pin toggle */}
            <label className="flex items-center gap-2 text-sm text-app-text cursor-pointer">
              <input
                type="checkbox"
                checked={draft.pinMessage}
                onChange={togglePin}
                className="h-4 w-4 rounded border-app-border text-app-primary focus:ring-app-primary/30"
              />
              <Pin className="h-3.5 w-3.5 text-app-text-muted" />
              메시지 고정 (Pin)
            </label>

            {/* Submit */}
            <Button
              type="submit"
              variant="primary"
              className="flex w-full h-11 items-center justify-center gap-2"
              disabled={!canSubmit || submitting}
            >
              {submitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  발행 중...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  채널에 발행
                </>
              )}
            </Button>
          </form>
        </Panel>

        {/* Preview */}
        <Panel
          title={<div className="flex items-center gap-2"><Globe className="h-4 w-4 text-app-primary" /> 미리보기</div>}
          description="Telegram 채널에 표시될 모습입니다."
        >
          <div className="rounded-xl border border-app-border bg-app-surface p-4 min-h-[200px]">
            <ChannelHubPreview draft={draft} />
          </div>
          {draft.channelId && (
            <div className="mt-3 flex items-center gap-2 text-xs text-app-text-muted">
              <span>대상 채널: </span>
              <code className="rounded-md bg-app-card-hover px-1.5 py-0.5 font-mono text-app-text">{draft.channelId}</code>
              {draft.pinMessage && <Badge tone="info"><Pin className="h-3 w-3" /> 고정됨</Badge>}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
