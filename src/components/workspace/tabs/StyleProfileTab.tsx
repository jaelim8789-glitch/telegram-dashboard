"use client";

import { useState, useEffect } from "react";
import {
  Brain, Sparkles, Loader2, CheckCircle2, AlertTriangle,
  Palette, MessageSquare, Hash, Smile, Zap, ScrollText,
  BarChart3, Trash2, Plus, Copy, Check, Eye, EyeOff,
} from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { getToken } from "@/lib/auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

interface ToneAnalysis {
  tone?: string;
  formality_level?: number;
  avg_sentence_length?: string;
  emoji_usage?: string;
  emoji_types?: string[];
  vocabulary_style?: string;
  key_patterns?: string[];
  punctuation_style?: string;
  greeting_style?: string;
  closing_style?: string;
  cta_style?: string;
  summary?: string;
}

interface StyleProfile {
  id: string;
  name: string;
  source_type: string;
  source_text: string;
  tone_analysis: ToneAnalysis;
  style_prompt: string;
  created_at: string;
  updated_at: string;
}

function authHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const TONE_LABELS: Record<string, string> = {
  formal: "격식체", casual: "캐주얼", friendly: "친근함",
  professional: "전문적", humorous: "유머", persuasive: "설득적", neutral: "중립적",
};

const EMOJI_LABELS: Record<string, string> = {
  none: "사용 안 함", rare: "거의 없음", moderate: "보통", heavy: "많이 사용",
};

export function StyleProfileTab() {
  const [name, setName] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [profiles, setProfiles] = useState<StyleProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<StyleProfile | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [promptCopied, setPromptCopied] = useState<string | null>(null);

  useEffect(() => { loadProfiles(); }, []);

  async function loadProfiles() {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/style-profiles`, { headers: authHeaders() });
      if (res.ok) setProfiles(await res.json());
    } catch { }
    finally { setLoading(false); }
  }

  async function analyze() {
    if (!sourceText.trim() || analyzing) return;
    setAnalyzing(true);
    setError("");
    try {
      const res = await fetch(`${BASE_URL}/api/style-profiles/analyze`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name: name.trim() || `스타일 ${new Date().toLocaleDateString("ko-KR")}`,
          source_type: "text",
          source_text: sourceText,
        }),
      });
      if (res.ok) {
        const profile = await res.json();
        setProfiles((prev) => [profile, ...prev]);
        setSelectedProfile(profile);
        setSourceText("");
        setName("");
      } else {
        const err = await res.json().catch(() => ({ detail: "분석 실패" }));
        setError(err.detail || "분석에 실패했습니다");
      }
    } catch {
      setError("네트워크 오류");
    } finally { setAnalyzing(false); }
  }

  async function deleteProfile(id: string) {
    setDeletingId(id);
    try {
      await fetch(`${BASE_URL}/api/style-profiles/${id}`, {
        method: "DELETE", headers: authHeaders(),
      });
      setProfiles((prev) => prev.filter((p) => p.id !== id));
      if (selectedProfile?.id === id) setSelectedProfile(null);
    } catch { }
    finally { setDeletingId(null); }
  }

  function copyStylePrompt(profileId: string, prompt: string) {
    navigator.clipboard.writeText(prompt);
    setPromptCopied(profileId);
    setTimeout(() => setPromptCopied(null), 2000);
  }

  const wordCount = sourceText.replace(/\s/g, "").length;
  const a = selectedProfile?.tone_analysis;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-app-primary/10">
          <Palette className="h-5 w-5 text-app-primary" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-app-text">브랜드 스타일 분석</h2>
          <p className="text-[10px] text-app-text-muted">게시글 50~100개를 붙여넣으면 AI가 당신의 글쓰기 스타일을 학습합니다</p>
        </div>
      </div>

      {/* Input */}
      <Panel title="📝 게시글 붙여넣기" className="border-app-primary/20">
        <div className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="스타일 이름 (예: 우리 브랜드 톤)"
            className="w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-xs outline-none focus:border-app-primary"
          />
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value.slice(0, 50000))}
            placeholder={`분석할 게시글들을 여기에 붙여넣으세요.\n\n예:\n- 광고 카피\n- 블로그 글\n- SNS 게시글\n- 고객 응대 메시지\n\n많을수록 정확도가 올라갑니다 (최대 50,000자)`}
            rows={8}
            className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 text-xs text-app-text placeholder:text-app-text-muted outline-none focus:border-app-primary focus:ring-1 focus:ring-app-primary/30 resize-none font-mono"
          />
          <div className="flex items-center justify-between">
            <span className={`text-[10px] ${wordCount >= 500 ? "text-app-success" : "text-app-text-muted"}`}>
              {wordCount.toLocaleString()}자 {wordCount < 500 && "(500자 이상 권장)"}
            </span>
            <Button variant="primary" onClick={analyze} loading={analyzing} disabled={!sourceText.trim() || wordCount < 100}>
              <Brain className="h-3.5 w-3.5" />
              스타일 분석하기
            </Button>
          </div>
        </div>
      </Panel>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-app-danger/30 bg-app-danger-muted/10 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-app-danger" />
          <p className="text-xs text-app-danger">{error}</p>
        </div>
      )}

      {/* Saved Profiles */}
      <Panel title="🎨 저장된 스타일">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-app-text-muted py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중...
          </div>
        ) : profiles.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-app-text-muted">
            <Palette className="h-8 w-8 opacity-30" />
            <p className="text-xs">아직 분석된 스타일이 없습니다</p>
            <p className="text-[10px]">위에 게시글을 붙여넣고 분석을 시작하세요</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProfile(p.id === selectedProfile?.id ? null : p)}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                  selectedProfile?.id === p.id
                    ? "border-app-primary/40 bg-app-primary/5"
                    : "border-app-border bg-app-card hover:bg-app-card-hover"
                )}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-app-primary/10">
                  <Palette className="h-4 w-4 text-app-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-app-text truncate">{p.name}</p>
                    {p.tone_analysis?.tone && (
                      <span className="shrink-0 rounded-full bg-app-primary/10 px-1.5 py-0 text-[9px] text-app-primary">
                        {TONE_LABELS[p.tone_analysis.tone] || p.tone_analysis.tone}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-app-text-muted mt-0.5 line-clamp-1">
                    {p.tone_analysis?.summary || "분석 완료"}
                  </p>
                  <p className="text-[9px] text-app-text-muted mt-1">
                    {new Date(p.created_at).toLocaleDateString("ko-KR")}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteProfile(p.id); }}
                  disabled={deletingId === p.id}
                  className="shrink-0 p-1 rounded text-app-text-muted hover:text-app-danger hover:bg-app-danger/10 transition-colors"
                >
                  {deletingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </button>
            ))}
          </div>
        )}
      </Panel>

      {/* Style Detail */}
      {selectedProfile && a && (
        <div className="space-y-3 animate-scale-in">
          {/* Summary card */}
          <Panel title="📊 분석 결과">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {a.tone && (
                <div className="rounded-lg border border-app-border bg-app-bg p-2.5 text-center">
                  <p className="text-[9px] text-app-text-muted">톤</p>
                  <p className="text-xs font-semibold text-app-text mt-0.5">{TONE_LABELS[a.tone] || a.tone}</p>
                </div>
              )}
              {a.formality_level !== undefined && (
                <div className="rounded-lg border border-app-border bg-app-bg p-2.5 text-center">
                  <p className="text-[9px] text-app-text-muted">격식도</p>
                  <p className="text-xs font-semibold text-app-text mt-0.5">
                    {Math.round(a.formality_level * 100)}%
                  </p>
                </div>
              )}
              {a.emoji_usage && (
                <div className="rounded-lg border border-app-border bg-app-bg p-2.5 text-center">
                  <p className="text-[9px] text-app-text-muted">이모지</p>
                  <p className="text-xs font-semibold text-app-text mt-0.5">{EMOJI_LABELS[a.emoji_usage] || a.emoji_usage}</p>
                </div>
              )}
              {a.avg_sentence_length && (
                <div className="rounded-lg border border-app-border bg-app-bg p-2.5 text-center">
                  <p className="text-[9px] text-app-text-muted">문장 길이</p>
                  <p className="text-xs font-semibold text-app-text mt-0.5">
                    {a.avg_sentence_length === "short" ? "짧음" : a.avg_sentence_length === "long" ? "김" : "보통"}
                  </p>
                </div>
              )}
            </div>
            {a.summary && (
              <div className="mt-3 rounded-lg bg-app-bg p-3 border border-app-border">
                <p className="text-[11px] text-app-text leading-relaxed">{a.summary}</p>
              </div>
            )}
          </Panel>

          {/* Detailed breakdown */}
          <Panel
            title="🔍 상세 분석"
            action={
              <button onClick={() => setShowRaw(!showRaw)} className="text-[10px] text-app-text-muted hover:text-app-text">
                {showRaw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showRaw ? "간단히" : "상세히"}
              </button>
            }
          >
            <div className="space-y-2">
              {a.vocabulary_style && (
                <div className="flex items-center gap-3 text-xs">
                  <span className="shrink-0 w-20 text-app-text-muted">어휘 스타일</span>
                  <span className="text-app-text font-medium">{a.vocabulary_style}</span>
                </div>
              )}
              {a.punctuation_style && (
                <div className="flex items-center gap-3 text-xs">
                  <span className="shrink-0 w-20 text-app-text-muted">문장부호</span>
                  <span className="text-app-text">{a.punctuation_style}</span>
                </div>
              )}
              {a.greeting_style && (
                <div className="flex items-center gap-3 text-xs">
                  <span className="shrink-0 w-20 text-app-text-muted">시작 패턴</span>
                  <span className="text-app-text">{a.greeting_style}</span>
                </div>
              )}
              {a.closing_style && (
                <div className="flex items-center gap-3 text-xs">
                  <span className="shrink-0 w-20 text-app-text-muted">마무리 패턴</span>
                  <span className="text-app-text">{a.closing_style}</span>
                </div>
              )}
              {a.cta_style && (
                <div className="flex items-center gap-3 text-xs">
                  <span className="shrink-0 w-20 text-app-text-muted">CTA</span>
                  <span className="text-app-text font-medium">{a.cta_style}</span>
                </div>
              )}
              {a.emoji_types && a.emoji_types.length > 0 && (
                <div className="flex items-start gap-3 text-xs">
                  <span className="shrink-0 w-20 text-app-text-muted">이모지 유형</span>
                  <div className="flex flex-wrap gap-1">
                    {a.emoji_types.map((e, i) => (
                      <span key={i} className="rounded-full bg-app-card-hover px-2 py-0.5 text-[10px] text-app-text">{e}</span>
                    ))}
                  </div>
                </div>
              )}
              {showRaw && a.key_patterns && a.key_patterns.length > 0 && (
                <div className="pt-2 border-t border-app-border">
                  <p className="text-[10px] text-app-text-muted mb-1">주요 패턴</p>
                  {a.key_patterns.map((p, i) => (
                    <p key={i} className="text-[11px] text-app-text ml-2">• {p}</p>
                  ))}
                </div>
              )}
            </div>
          </Panel>

          {/* Style Prompt */}
          {selectedProfile.style_prompt && (
            <Panel title="🎯 스타일 프롬프트">
              <div className="relative">
                <pre className="rounded-lg border border-app-border bg-app-bg p-3 text-[11px] text-app-text whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
                  {selectedProfile.style_prompt}
                </pre>
                <button
                  onClick={() => copyStylePrompt(selectedProfile.id, selectedProfile.style_prompt)}
                  className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-app-card border border-app-border px-2 py-1 text-[10px] hover:bg-app-card-hover transition-colors"
                >
                  {promptCopied === selectedProfile.id ? <Check className="h-3 w-3 text-app-success" /> : <Copy className="h-3 w-3" />}
                  {promptCopied === selectedProfile.id ? "복사됨" : "복사"}
                </button>
              </div>
              <p className="text-[10px] text-app-text-muted mt-2">
                이 프롬프트를 AI 발송이나 콘텐츠 스튜디오에서 &quot;스타일 참조&quot;로 활용하면 동일한 톤으로 작성합니다
              </p>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}
