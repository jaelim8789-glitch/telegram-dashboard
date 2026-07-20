"use client";

import { useState, useCallback } from "react";
import {
  Sparkles, Copy, Check, Loader2, CalendarDays, SendHorizontal,
  Bot, FileText, AlertCircle, ChevronDown, ChevronUp,
} from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { AiSubTabLayout } from "@/components/ai/AiSubTabLayout";
import { ContentTypeCard } from "./ContentTypeCard";
import { CalendarPreview } from "./CalendarPreview";
import {
  CONTENT_TYPES,
  generateContent,
  type ContentType,
  type ContentTone,
  type GeneratedContentItem,
} from "@/lib/content-studio-api";

const DAILY_COUNT_OPTIONS = [1, 2, 3, 4, 5] as const;

const TONE_OPTIONS: { value: ContentTone; label: string }[] = [
  { value: "short", label: "짧게" },
  { value: "emotional", label: "감성" },
  { value: "intense", label: "강렬" },
];

export function AiContentStudioTab() {
  const [selectedType, setSelectedType] = useState<ContentType | null>(null);
  const [tone, setTone] = useState<ContentTone>("short");
  const [topic, setTopic] = useState("");
  const [context, setContext] = useState("");
  const [styleProfileId, setStyleProfileId] = useState<string | undefined>(undefined);

  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedContentItem | null>(null);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [dailyCount, setDailyCount] = useState(2);
  const [selectedTypes, setSelectedTypes] = useState<ContentType[]>([
    "promotional",
    "announcement",
    "engagement",
  ]);
  const [showCalendar, setShowCalendar] = useState(false);

  const handleTypeSelect = useCallback((id: ContentType) => {
    setSelectedType(id);
    setGenerated(null);
    setError("");
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!selectedType || generating) return;
    setGenerating(true);
    setError("");
    setGenerated(null);

    try {
      const result = await generateContent({
        content_type: selectedType,
        tone,
        topic: topic || undefined,
        context: context || undefined,
        style_profile_id: styleProfileId || undefined,
      });
      setGenerated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "콘텐츠 생성에 실패했습니다");
    } finally {
      setGenerating(false);
    }
  }, [selectedType, tone, topic, context, styleProfileId, generating]);

  const handleCopy = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // silently fail
    }
  }, []);

  const toggleContentType = useCallback((type: ContentType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }, []);

  return (
    <AiSubTabLayout
      icon={<Bot className="h-5 w-5 text-app-primary" />}
      title="AI 콘텐츠 스튜디오"
      subtitle="AI 콘텐츠 생성 & 예약 발송"
      badge="NEW"
      error={error}
      empty={!selectedType && !generated && !generating}
      emptyFallback={
        <>
          <FileText className="h-10 w-10 text-app-text-subtle mb-3" />
          <p className="text-sm font-medium text-app-text">AI가 콘텐츠를 생성해드립니다</p>
          <p className="text-xs text-app-text-muted mt-1">콘텐츠 타입을 선택하고</p>
          <p className="text-xs text-app-text-muted">원하는 메시지를 만들어보세요</p>
        </>
      }
    >
      <div className="space-y-4">
        {/* ── Step 1: Content Type Selection ──────────────────────────── */}
        <Panel title="1. 콘텐츠 타입 선택" description="생성할 콘텐츠의 종류를 선택하세요">
          <div className="flex flex-wrap gap-2">
            {CONTENT_TYPES.map((ct) => (
              <ContentTypeCard
                key={ct.id}
                {...ct}
                selected={selectedType === ct.id}
                onSelect={handleTypeSelect}
              />
            ))}
          </div>
        </Panel>

        {/* ── Step 2: Generation Options ──────────────────────────────── */}
        <Panel title="2. 생성 옵션" description="콘텐츠 스타일과 대상을 설정하세요">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-medium text-app-text-muted">톤</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as ContentTone)}
                className="mt-1 w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-xs text-app-text focus:outline-none focus:border-app-primary"
              >
                {TONE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-app-text-muted">주제 (선택)</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="예: 신규 상품 출시, 여름 이벤트"
                className="mt-1 w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-xs text-app-text placeholder:text-app-text-muted focus:outline-none focus:border-app-primary"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] font-medium text-app-text-muted">추가 컨텍스트 (선택)</label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="예: 무료 배송, 20% 할인, 오늘 하루만"
                rows={2}
                className="mt-1 w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-xs text-app-text placeholder:text-app-text-muted focus:outline-none focus:border-app-primary resize-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] font-medium text-app-text-muted">스타일 프로필 ID (선택)</label>
              <input
                type="text"
                value={styleProfileId}
                onChange={(e) => setStyleProfileId(e.target.value || undefined)}
                placeholder="예: style-123"
                className="mt-1 w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-xs text-app-text placeholder:text-app-text-muted focus:outline-none focus:border-app-primary"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!selectedType || generating}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-app-primary px-4 py-2.5 text-xs font-medium text-white hover:bg-app-primary-hover disabled:opacity-50 transition-colors"
          >
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {generating ? "생성 중..." : selectedType ? "AI 콘텐츠 생성" : "콘텐츠 타입을 먼저 선택하세요"}
          </button>
        </Panel>

        {/* ── Step 3: Preview ─────────────────────────────────────────── */}
        {generated && generated.generated_content && (
          <Panel
            title="3. 미리보기"
            description="생성된 콘텐츠를 확인하고 복사하거나 예약 발송하세요"
            accent="indigo"
          >
            <div className="space-y-3">
              <div className="rounded-xl border border-app-primary/20 bg-app-primary-muted/10 p-4">
                <p className="text-xs text-app-text whitespace-pre-wrap leading-relaxed">
                  {generated.generated_content}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(generated.generated_content, generated.generated_content.slice(0, 8))}
                  className="flex items-center gap-1.5 rounded-lg border border-app-border px-3 py-1.5 text-xs text-app-text hover:bg-app-card-hover transition-colors"
                >
                  {copiedId === generated.generated_content.slice(0, 8) ? (
                    <Check className="h-3.5 w-3.5 text-app-success" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copiedId === generated.generated_content.slice(0, 8) ? "복사됨" : "복사"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCalendar(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-app-primary/30 bg-app-primary/5 px-3 py-1.5 text-xs font-medium text-app-primary hover:bg-app-primary/10 transition-colors"
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  예약 발송
                </button>
              </div>
            </div>
          </Panel>
        )}

        {/* ── Step 4: Calendar / Scheduling ──────────────────────────── */}
        <Panel
          title="4. 콘텐츠 캘린더 설정"
          description="하루 발송할 콘텐츠 수를 선택하면 시간대가 자동 배치됩니다"
          accent="emerald"
          action={
            <button
              type="button"
              onClick={() => setShowCalendar(!showCalendar)}
              className="flex items-center gap-1 text-xs text-app-text-muted hover:text-app-text transition-colors"
            >
              {showCalendar ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          }
        >
          {/* Daily count selector */}
          <div className="mb-4">
            <label className="text-[11px] font-medium text-app-text-muted">하루 발송할 콘텐츠 수</label>
            <div className="mt-1.5 flex gap-1.5">
              {DAILY_COUNT_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDailyCount(n)}
                  className={`flex h-8 w-10 items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                    dailyCount === n
                      ? "bg-app-primary text-white shadow-sm"
                      : "border border-app-border bg-app-card text-app-text-muted hover:bg-app-card-hover"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Content types for calendar */}
          <div className="mb-4">
            <label className="text-[11px] font-medium text-app-text-muted">포함할 콘텐츠 타입</label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {CONTENT_TYPES.map((ct) => {
                const isSelected = selectedTypes.includes(ct.id);
                return (
                  <button
                    key={ct.id}
                    type="button"
                    onClick={() => toggleContentType(ct.id)}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs transition-all ${
                      isSelected
                        ? "bg-app-primary/10 text-app-primary border border-app-primary/30"
                        : "border border-app-border text-app-text-muted hover:bg-app-card-hover"
                    }`}
                  >
                    <span className="text-sm leading-none">{ct.emoji}</span>
                    {ct.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Calendar preview */}
          {showCalendar && (
            <div className="rounded-xl border border-app-border bg-app-bg/40 p-3">
              <CalendarPreview dailyCount={dailyCount} selectedTypes={selectedTypes} />
            </div>
          )}

          {/* Schedule button */}
          <button
            type="button"
            disabled={selectedTypes.length === 0}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-app-primary px-4 py-2.5 text-xs font-medium text-white hover:bg-app-primary-hover disabled:opacity-50 transition-colors"
          >
            <SendHorizontal className="h-3.5 w-3.5" />
            예약 발송 시작
          </button>
        </Panel>
      </div>
    </AiSubTabLayout>
  );
}