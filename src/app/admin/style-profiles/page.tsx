"use client";

import { useEffect, useState, useCallback, type FormEvent } from "react";
import Link from "next/link";
import {
  ChevronLeft, Copy, FileText, MessageSquare, Plus, RefreshCw, Sparkles, Trash2, PenLine,
} from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Panel } from "@/components/ui/Panel";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineError } from "@/components/ui/InlineError";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import * as api from "@/lib/api";
import type { StyleProfile } from "@/lib/api";

import { formatDateTime } from "@/lib/formatTime";

function safeStr(v: unknown): string {
  return v != null ? String(v) : "";
}

function StyleProfilesContent() {
  const [profiles, setProfiles] = useState<StyleProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState<"url" | "text">("text");
  const [sourceText, setSourceText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<StyleProfile | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProfiles(await api.fetchStyleProfiles());
    } catch (err) {
      setError(err instanceof Error ? err.message : "프로필 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAnalyze(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !sourceText.trim() || analyzing) return;
    setAnalyzing(true);
    setError(null);
    try {
      await api.analyzeStyleProfile({ name: name.trim(), source_type: sourceType, source_text: sourceText });
      setName("");
      setSourceText("");
      await load();
      toast("success", "스타일 분석이 완료되었습니다.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "분석에 실패했습니다.";
      setError(msg);
      toast("error", msg);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await api.deleteStyleProfile(deleteTarget.id);
      await load();
      toast("success", `"${deleteTarget.name}" 프로필이 삭제되었습니다.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "삭제에 실패했습니다.";
      setError(msg);
      toast("error", msg);
    } finally {
      setDeleteTarget(null);
      setDeletingId(null);
    }
  }

  async function copyToClipboard(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast("success", "클립보드에 복사되었습니다.");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast("error", "복사에 실패했습니다.");
    }
  }

  const TONE_LABEL: Record<string, string> = {
    formal: "격식체", casual: "반말/ casual", friendly: "친근함",
    professional: "전문적", humorous: "유머러스", persuasive: "설득력", neutral: "중립",
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-app-text">AI 말투 학습</h1>
          <p className="mt-0.5 text-sm text-app-text-muted">
            텔레그램 채널 글/텍스트를 분석하여 말투 프로필 생성 · {profiles.length}개 프로필
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/dashboard" className="flex items-center gap-1 text-xs text-app-primary-hover hover:underline transition-colors">
            <ChevronLeft className="h-3 w-3" /> 관리자 홈
          </Link>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-app-border bg-app-card px-3 py-1.5 text-xs text-app-text-muted transition-all duration-150 hover:border-app-border-strong hover:text-app-text"
          >
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} /> 새로고침
          </button>
        </div>
      </div>

      {error && <InlineError>{error}</InlineError>}

      <Panel
        title={
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            새 스타일 분석
          </div>
        }
        description="텔레그램 채널 메시지 또는 기존 글 100개 분량을 붙여넣으면 AI가 말투/문체를 학습합니다."
      >
        <form onSubmit={handleAnalyze} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Field label="프로필 이름">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 공지 채널 말투, 마케팅 톤"
                  required
                />
              </Field>
            </div>
            <div>
              <Field label="입력 방식">
                <Select value={sourceType} onChange={(e) => setSourceType(e.target.value as "url" | "text")}>
                  <option value="text">텍스트 붙여넣기</option>
                  <option value="url" disabled>채널 URL (준비 중)</option>
                </Select>
              </Field>
            </div>
          </div>
          <Field label="분석할 텍스트 (10자 이상, 최대 50,000자)">
            <Textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="텔레그램 채널의 메시지나 글을 붙여넣으세요...&#10;&#10;예시:&#10;안녕하세요! 오늘도 좋은 소식 가져왔습니다 🎉&#10;새로운 업데이트 소식을 전해드립니다~&#10;모두들 행복한 하루 되세요! 😊"
              rows={6}
              required
              maxLength={50000}
            />
          </Field>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-app-text-muted">{sourceText.length.toLocaleString()}/50,000자</span>
            <Button type="submit" variant="primary" loading={analyzing} disabled={analyzing || !name.trim() || sourceText.length < 10}>
              <Sparkles className="h-3.5 w-3.5" /> AI 분석 시작
            </Button>
          </div>
        </form>
      </Panel>

      <Panel
        title={
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            저장된 스타일 프로필
          </div>
        }
        description="분석이 완료된 프로필 목록입니다. 콘텐츠 생성 시 프롬프트에 포함하여 사용할 수 있습니다."
      >
        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={`ad-sp-sk-${i}`} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        )}

        {!loading && error && <InlineError>{error}</InlineError>}

        {!loading && !error && profiles.length === 0 && (
          <EmptyState
            icon={MessageSquare}
            title="분석된 프로필 없음"
            description="위 폼에서 텍스트를 붙여넣고 AI 분석을 시작해주세요."
          />
        )}

        {!loading && profiles.length > 0 && (
          <div className="divide-y divide-app-border">
            {profiles.map((p) => {
              const isDeleting = deletingId === p.id;
              const isExpanded = expandedId === p.id;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tone_analysis is a loosely-shaped JSON blob rendered ad hoc below
              const analysis = p.tone_analysis as Record<string, any>;
              const tone = (analysis?.tone as string) || "neutral";

              return (
                <div
                  key={p.id}
                  className={cn(
                    "py-3 text-sm transition-colors -mx-4 px-4 first:rounded-t-lg last:rounded-b-lg",
                    isDeleting ? "opacity-50" : "hover:bg-app-card-hover"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-app-text">{p.name}</span>
                        <Badge tone="info">{TONE_LABEL[tone] || tone}</Badge>
                        <Badge tone="neutral">{p.source_type === "url" ? "채널" : "텍스트"}</Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-app-text-muted">
                        <span>생성 {formatDateTime(p.created_at)}</span>
                        <span>소스 {(p.source_text?.length ?? 0).toLocaleString()}자</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedId(isExpanded ? null : p.id)}
                      >
                        <PenLine className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setDeleteTarget(p)}
                        loading={isDeleting}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 space-y-2 rounded-xl border border-app-border bg-app-bg p-3">
                      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                        {analysis?.formality_level != null && (
                          <div>
                            <span className="text-app-text-muted">격식 수준</span>
                            <div className="mt-0.5 font-medium text-app-text">
                              {safeStr(
                                typeof analysis.formality_level === "number"
                                  ? `${(analysis.formality_level * 100).toFixed(0)}%`
                                  : analysis.formality_level
                              )}
                            </div>
                          </div>
                        )}
                        {analysis?.avg_sentence_length && (
                          <div>
                            <span className="text-app-text-muted">문장 길이</span>
                            <div className="mt-0.5 font-medium text-app-text">
                              {safeStr(analysis.avg_sentence_length)}
                            </div>
                          </div>
                        )}
                        {analysis?.emoji_usage && (
                          <div>
                            <span className="text-app-text-muted">이모지 사용</span>
                            <div className="mt-0.5 font-medium text-app-text">
                              {safeStr(analysis.emoji_usage)}
                            </div>
                          </div>
                        )}
                        {analysis?.vocabulary_style && (
                          <div>
                            <span className="text-app-text-muted">어휘 스타일</span>
                            <div className="mt-0.5 font-medium text-app-text">
                              {safeStr(analysis.vocabulary_style)}
                            </div>
                          </div>
                        )}
                        {analysis?.greeting_style && (
                          <div>
                            <span className="text-app-text-muted">인사 스타일</span>
                            <div className="mt-0.5 font-medium text-app-text">
                              {safeStr(analysis.greeting_style)}
                            </div>
                          </div>
                        )}
                        {analysis?.closing_style && (
                          <div>
                            <span className="text-app-text-muted">마무리 스타일</span>
                            <div className="mt-0.5 font-medium text-app-text">
                              {safeStr(analysis.closing_style)}
                            </div>
                          </div>
                        )}
                      </div>

                      {analysis?.summary && (
                        <div className="text-xs">
                          <span className="text-app-text-muted">요약</span>
                          <p className="mt-0.5 text-app-text">{safeStr(analysis.summary)}</p>
                        </div>
                      )}

                      {analysis?.key_patterns && Array.isArray(analysis.key_patterns) && analysis.key_patterns.length > 0 && (
                        <div className="text-xs">
                          <span className="text-app-text-muted">주요 패턴</span>
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            {(analysis.key_patterns as string[]).map((pattern, i) => (
                              <span key={`kp-${i}`} className="rounded-md border border-app-border bg-app-card px-1.5 py-0.5 text-[11px] text-app-text">
                                {pattern}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-app-text-muted">스타일 프롬프트</span>
                          <button
                            onClick={() => copyToClipboard(p.style_prompt, p.id)}
                            className="flex items-center gap-1 text-app-primary-hover hover:underline"
                          >
                            <Copy className="h-3 w-3" />
                            {copiedId === p.id ? "복사됨" : "복사"}
                          </button>
                        </div>
                        <pre className="mt-1 whitespace-pre-wrap rounded-lg border border-app-border bg-app-card px-3 py-2 text-[11px] text-app-text-muted font-sans">
                          {p.style_prompt}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <ConfirmDialog
        open={!!deleteTarget}
        title="스타일 프로필 삭제"
        description={deleteTarget
          ? `"${deleteTarget.name}" 프로필을 삭제합니다. 연결된 콘텐츠 생성에서 더 이상 이 스타일을 사용할 수 없습니다.`
          : ""}
        variant="danger"
        confirmLabel="영구 삭제"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default function StyleProfilesPage() {
  return (
    <AdminGuard requireAdmin>
      <StyleProfilesContent />
    </AdminGuard>
  );
}
