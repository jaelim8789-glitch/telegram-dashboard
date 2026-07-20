"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Sparkles, Copy, Check, Loader2, CalendarDays, SendHorizontal,
  Bot, FileText, AlertCircle, ChevronDown, ChevronUp, ExternalLink,
} from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { AiSubTabLayout } from "@/components/ai/AiSubTabLayout";
import { ContentTypeCard } from "./ContentTypeCard";
import { CalendarPreview } from "./CalendarPreview";
import {
  CONTENT_TYPES,
  generateContent,
  previewCalendar,
  type ContentType,
  type ContentTone,
  type GenerateContentResponse,
  type CalendarSlot,
} from "@/lib/content-studio-api";
import { fetchStyleProfiles, createBroadcast, type StyleProfile } from "@/lib/api";
import { createDraft } from "@/lib/draft-api";
import { useToast } from "@/components/ui/Toast";
import { useDashboardStore } from "@/store/useDashboardStore";

const DAILY_COUNT_OPTIONS = [1, 2, 3, 4, 5] as const;

const TONE_OPTIONS: { value: ContentTone; label: string }[] = [
  { value: "professional", label: "전문적인" },
  { value: "friendly", label: "친근한" },
  { value: "warm", label: "따뜻한" },
  { value: "casual", label: "격식 없는" },
];

export function AiContentStudioTab() {
  const { toast } = useToast();
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const accounts = useDashboardStore((s) => s.accounts);

  // ── Content type selection ──────────────────────────────────────────
  const [selectedType, setSelectedType] = useState<ContentType | null>(null);

  // ── Generation options ──────────────────────────────────────────────
  const [tone, setTone] = useState<ContentTone>("professional");
  const [topic, setTopic] = useState("");
  const [context, setContext] = useState("");
  const [styleProfileId, setStyleProfileId] = useState<string>("");
  const [styleProfiles, setStyleProfiles] = useState<StyleProfile[]>([]);
  const [styleProfilesLoading, setStyleProfilesLoading] = useState(false);

  // ── Generation state ────────────────────────────────────────────────
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GenerateContentResponse | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // ── Draft 저장 상태 ────────────────────────────────────────────────
  const [savedDraftId, setSavedDraftId] = useState<string | null>(null);

  // ── Calendar / scheduling ───────────────────────────────────────────
  const [dailyCount, setDailyCount] = useState(2);
  const [selectedTypes, setSelectedTypes] = useState<ContentType[]>([
    "morning_greeting",
    "quote",
    "market_briefing",
  ]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarSlots, setCalendarSlots] = useState<CalendarSlot[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  // ── Load style profiles on mount ────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setStyleProfilesLoading(true);
    fetchStyleProfiles()
      .then((list) => { if (!cancelled) setStyleProfiles(list); })
      .catch(() => { /* silently fail — dropdown just won't show */ })
      .finally(() => { if (!cancelled) setStyleProfilesLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────

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
    setSavedDraftId(null);

    try {
      const result = await generateContent({
        content_type: selectedType,
        tone,
        topic: topic || undefined,
        context: context || undefined,
        style_profile_id: styleProfileId || undefined,
      });
      setGenerated(result);

      // 생성 결과를 Draft로 자동 저장
      try {
        const draftResult = await createDraft({
          title: CONTENT_TYPES.find((ct) => ct.id === selectedType)?.label ?? selectedType,
          content: result.generated_content,
          content_type: selectedType,
          source: "content_studio",
          ai_model: "telemon-ai",
          tokens_used: result.tokens_used,
        });
        setSavedDraftId(draftResult.id);
      } catch {
        toast("error", "Draft 저장에 실패했습니다. 생성된 콘텐츠는 복사해서 사용하세요.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "콘텐츠 생성에 실패했습니다";
      setError(msg);
    } finally {
      setGenerating(false);
    }
  }, [selectedType, tone, topic, context, styleProfileId, generating, toast]);

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silently fail
    }
  }, []);

  const toggleContentType = useCallback((type: ContentType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }, []);

  // ── Calendar preview ────────────────────────────────────────────────
  const handleCalendarToggle = useCallback(async () => {
    const next = !showCalendar;
    setShowCalendar(next);
    if (next && selectedTypes.length > 0) {
      setCalendarLoading(true);
      try {
        const result = await previewCalendar({
          daily_count: dailyCount,
          content_types: selectedTypes,
        });
        setCalendarSlots(result.slots);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "캘린더 미리보기를 불러오지 못했습니다";
        setError(msg);
      } finally {
        setCalendarLoading(false);
      }
    }
  }, [showCalendar, dailyCount, selectedTypes]);

  // ── Schedule broadcast ──────────────────────────────────────────────
  const handleSchedule = useCallback(async () => {
    if (scheduling || selectedTypes.length === 0) return;
    setScheduling(true);
    setError("");

    try {
      if (!selectedAccountId) {
        throw new Error("발송할 계정을 먼저 선택해주세요. 사이드바에서 계정을 선택하세요.");
      }

      const slots = calendarSlots.length > 0 ? calendarSlots
        : selectedTypes.map((ct, i) => {
            const info = CONTENT_TYPES.find((c) => c.id === ct)!;
            return {
              time: `${8 + i}:00`.padStart(5, "0"),
              content_type: ct,
              label: info.label,
            };
          });

      let scheduled = 0;
      for (const slot of slots) {
        const content = await generateContent({
          content_type: slot.content_type,
          tone,
          topic: topic || undefined,
          context: context || undefined,
          style_profile_id: styleProfileId || undefined,
        });

        await createBroadcast({
          accountId: selectedAccountId,
          message: content.generated_content,
          recipients: [],
          scheduledAt: new Date().toISOString(),
          deliveryMode: "normal",
        });
        scheduled++;
      }

      toast("success", `${scheduled}개 콘텐츠가 예약되었습니다`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "예약 발송에 실패했습니다";
      setError(msg);
      toast("error", msg);
    } finally {
      setScheduling(false);
    }
  }, [scheduling, selectedTypes, calendarSlots, tone, topic, context, styleProfileId, selectedAccountId, toast]);

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
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
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
            {/* Style Profile dropdown — OpenCode 말투학습 연동 */}
            <div className="sm:col-span-2">
              <label className="text-[11px] font-medium text-app-text-muted">
                말투 스타일 (선택)
                {styleProfilesLoading && <Loader2 className="ml-1 inline h-3 w-3 animate-spin" />}
              </label>
              <select
                value={styleProfileId}
                onChange={(e) => setStyleProfileId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-xs text-app-text focus:outline-none focus:border-app-primary"
              >
                <option value="">스타일 미적용 (기본)</option>
                {styleProfiles.map((sp) => (
                  <option key={sp.id} value={sp.id}>{sp.name}</option>
                ))}
              </select>
              {styleProfiles.length === 0 && !styleProfilesLoading && (
                <p className="mt-1 text-[10px] text-app-text-muted">
                  관리자 {'>'} AI 말투 학습에서 스타일 프로필을 먼저 생성하세요
                </p>
              )}
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
                {generated.style_profile_id && (
                  <p className="mt-2 text-[10px] text-app-text-muted">
                    말투 스타일 적용됨 (ID: {generated.style_profile_id})
                  </p>
                )}
                {generated.tokens_used > 0 && (
                  <p className="mt-1 text-[10px] text-app-text-muted">
                    사용 토큰: {generated.tokens_used.toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(generated.generated_content)}
                  className="flex items-center gap-1.5 rounded-lg border border-app-border px-3 py-1.5 text-xs text-app-text hover:bg-app-card-hover transition-colors"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-app-success" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied ? "복사됨" : "복사"}
                </button>
                <button
                  type="button"
                  onClick={handleCalendarToggle}
                  className="flex items-center gap-1.5 rounded-lg border border-app-primary/30 bg-app-primary/5 px-3 py-1.5 text-xs font-medium text-app-primary hover:bg-app-primary/10 transition-colors"
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  예약 발송
                </button>
                {/* Draft 저장 상태 + DraftsTab 이동 */}
                {savedDraftId ? (
                  <>
                    <span className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-1.5 text-xs font-medium text-emerald-600">
                      <Check className="h-3.5 w-3.5" />
                      Draft 저장됨
                    </span>
                    <a
                      onClick={(e) => {
                        e.preventDefault();
                        const draftsTab = document.querySelector('[data-tab-id="drafts"]');
                        if (draftsTab instanceof HTMLElement) draftsTab.click();
                      }}
                      className="flex items-center gap-1.5 rounded-lg border border-app-primary/30 bg-app-primary/5 px-3 py-1.5 text-xs font-medium text-app-primary hover:bg-app-primary/10 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      DraftsTab에서 검토
                    </a>
                  </>
                ) : generated && !savedDraftId && (
                  <span className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] text-app-text-muted">
                    Draft 미저장
                  </span>
                )}
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
              onClick={handleCalendarToggle}
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
                    <span className="hidden sm:inline">{ct.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Calendar preview */}
          {showCalendar && (
            <div className="rounded-xl border border-app-border bg-app-bg/40 p-3">
              {calendarLoading ? (
                <div className="flex items-center justify-center py-6 text-app-text-muted">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-xs">캘린더 로딩 중...</span>
                </div>
              ) : (
                <CalendarPreview dailyCount={dailyCount} selectedTypes={selectedTypes} />
              )}
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-app-danger/30 bg-app-danger-muted/10 p-3">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-app-danger" />
              <p className="text-xs text-app-danger whitespace-pre-wrap">{error}</p>
            </div>
          )}

          {/* Schedule button */}
          <button
            type="button"
            onClick={handleSchedule}
            disabled={selectedTypes.length === 0 || scheduling}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-app-primary px-4 py-2.5 text-xs font-medium text-white hover:bg-app-primary-hover disabled:opacity-50 transition-colors"
          >
            {scheduling ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <SendHorizontal className="h-3.5 w-3.5" />
            )}
            {scheduling ? "예약 중..." : "예약 발송 시작"}
          </button>
        </Panel>
      </div>
    </AiSubTabLayout>
  );
}