"use client";

import { useState, useEffect } from "react";
import { Bot, Sparkles, Copy, Check, Loader2, Send, Users, Palette } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { AiSubTabLayout } from "@/components/ai/AiSubTabLayout";
import { useDashboardStore } from "@/store/useDashboardStore";

export function AiBroadcastAssistantTab() {
  const selectedIds = useDashboardStore((s) => s.sendSelectedGroupIds);
  const groups = useDashboardStore((s) => s.sendGroups);
  const selectedRecipients = groups.filter((g) => selectedIds.includes(g.id));
  const [purpose, setPurpose] = useState("");
  const [targetDescription, setTargetDescription] = useState("");
  const [tone, setTone] = useState("professional");
  const [language, setLanguage] = useState("ko");
  const [generateAbTest, setGenerateAbTest] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ message: string; variant_a?: string; variant_b?: string; reasoning?: string } | null>(null);
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [styleProfileId, setStyleProfileId] = useState("");
  const [styleProfiles, setStyleProfiles] = useState<{ id: string; name: string; style_prompt: string }[]>([]);

  const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    fetch(`${BASE}/api/style-profiles`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((r) => r.json().catch(() => []))
      .then((d) => setStyleProfiles(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const generateMessage = async () => {
    if (!purpose.trim() || loading) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/ai/broadcast-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose,
          target_description: targetDescription || undefined,
          tone,
          language,
          generate_ab_test: generateAbTest,
          style_prompt: styleProfileId
            ? styleProfiles.find((sp) => sp.id === styleProfileId)?.style_prompt || undefined
            : undefined,
        }),
      });

      if (res.ok) {
        setResult(await res.json());
      } else {
        const err = await res.json().catch(() => ({ detail: "오류 발생" }));
        setError(err.detail || "메시지 생성 실패");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally { setLoading(false); }
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessage(key);
    setTimeout(() => setCopiedMessage(null), 2000);
  };

  return (
    <AiSubTabLayout
      icon={<Bot className="h-5 w-5 text-app-primary" />}
      title="AI Broadcast Assistant"
      subtitle="AI 메시지 생성 & A/B 테스트"
      badge="NEW"
      error={error}
    >

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Settings */}
        <Panel title="메시지 설정" className="lg:col-span-1">
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-app-text-muted">발송 목적 *</label>
              <textarea value={purpose} onChange={e => setPurpose(e.target.value)}
                placeholder="예: 신규 서비스 런칭 홍보, VIP 고객 감사 이벤트 안내"
                rows={3}
                className="mt-1 w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-xs text-app-text placeholder:text-app-text-muted focus:outline-none focus:border-app-primary resize-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-app-text-muted">대상 설명 (선택)</label>
              <input type="text" value={targetDescription} onChange={e => setTargetDescription(e.target.value)}
                placeholder="예: 30대 직장인, 소상공인"
                className="mt-1 w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-xs text-app-text placeholder:text-app-text-muted focus:outline-none focus:border-app-primary"
              />
            </div>
            {/* 선택된 수신자 표시 */}
            <div>
              <label className="text-[11px] font-medium text-app-text-muted">대상 그룹</label>
              {selectedRecipients.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {selectedRecipients.slice(0, 5).map((g) => (
                    <span key={g.id} className="inline-flex items-center gap-1 rounded-full border border-app-border/60 bg-app-card-hover px-2 py-0.5 text-[10px] text-app-text">
                      <Users className="h-3 w-3" />
                      {g.title?.slice(0, 12) || g.id.slice(0, 8)}
                    </span>
                  ))}
                  {selectedRecipients.length > 5 && (
                    <span className="text-[10px] text-app-text-muted">+{selectedRecipients.length - 5}개</span>
                  )}
                </div>
              ) : (
                <p className="mt-1 text-[10px] text-app-text-muted">
                  발송탭에서 수신자 그룹을 먼저 선택하세요
                </p>
              )}
            </div>
            <div>
              <label className="text-[11px] font-medium text-app-text-muted">톤</label>
              <select value={tone} onChange={e => setTone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-xs text-app-text focus:outline-none focus:border-app-primary">
                <option value="professional">전문적인</option>
                <option value="friendly">친근한</option>
                <option value="urgent">긴급한</option>
                <option value="promotional">프로모션</option>
              </select>
            </div>
            {/* 스타일 프로필 */}
            {styleProfiles.length > 0 && (
              <div>
                <label className="text-[11px] font-medium text-app-text-muted flex items-center gap-1">
                  <Palette className="h-3 w-3 text-app-primary" /> 브랜드 스타일
                </label>
                <select value={styleProfileId} onChange={e => setStyleProfileId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-xs text-app-text focus:outline-none focus:border-app-primary">
                  <option value="">기본 (스타일 없음)</option>
                  {styleProfiles.map((sp) => (
                    <option key={sp.id} value={sp.id}>{sp.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-[11px] font-medium text-app-text-muted">언어</label>
              <select value={language} onChange={e => setLanguage(e.target.value)}
                className="mt-1 w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-xs text-app-text focus:outline-none focus:border-app-primary">
                <option value="ko">한국어</option>
                <option value="en">English</option>
                <option value="ja">日本語</option>
                <option value="zh">中文</option>
              </select>
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={generateAbTest} onChange={e => setGenerateAbTest(e.target.checked)}
                className="rounded border-app-border text-app-primary focus:ring-app-primary" />
              <span className="text-xs text-app-text">A/B 테스트 변형 생성</span>
            </label>
            <button onClick={generateMessage} disabled={!purpose.trim() || loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-app-primary px-4 py-2 text-xs font-medium text-white hover:bg-app-primary-hover disabled:opacity-50 transition-colors">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {loading ? "생성 중..." : "AI 메시지 생성"}
            </button>
          </div>
        </Panel>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {result && (
            <>
              <Panel title="📨 추천 메시지">
                <div className="space-y-2">
                  <div className="rounded-xl border border-app-primary/20 bg-app-primary-muted/10 p-3">
                    <p className="text-xs text-app-text whitespace-pre-wrap">{result.message}</p>
                  </div>
                  <button onClick={() => copyText(result.message, "main")}
                    className="flex items-center gap-1.5 rounded-lg border border-app-border px-3 py-1.5 text-xs text-app-text hover:bg-app-card-hover transition-colors">
                    {copiedMessage === "main" ? <Check className="h-3.5 w-3.5 text-app-success" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedMessage === "main" ? "복사됨" : "복사"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const store = useDashboardStore.getState();
                      store.setSendMessage(result.message);
                      store.setActiveTab("send");
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-app-primary px-3 py-1.5 text-xs text-white hover:bg-app-primary-hover transition-colors"
                  >
                    <Send className="h-3.5 w-3.5" /> 발송탭으로 보내기{selectedRecipients.length > 0 ? ` (${selectedRecipients.length}명)` : ""}
                  </button>
                </div>
              </Panel>

              {result.variant_a && (
                <Panel title="🔀 Variant A">
                  <div className="space-y-2">
                    <div className="rounded-xl border border-app-border bg-app-bg p-3">
                      <p className="text-xs text-app-text whitespace-pre-wrap">{result.variant_a}</p>
                    </div>
                    <button onClick={() => copyText(result.variant_a!, "a")}
                      className="flex items-center gap-1.5 rounded-lg border border-app-border px-3 py-1.5 text-xs text-app-text hover:bg-app-card-hover transition-colors">
                      {copiedMessage === "a" ? <Check className="h-3.5 w-3.5 text-app-success" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedMessage === "a" ? "복사됨" : "복사"}
                    </button>
                  </div>
                </Panel>
              )}

              {result.variant_b && (
                <Panel title="🔀 Variant B">
                  <div className="space-y-2">
                    <div className="rounded-xl border border-app-border bg-app-bg p-3">
                      <p className="text-xs text-app-text whitespace-pre-wrap">{result.variant_b}</p>
                    </div>
                    <button onClick={() => copyText(result.variant_b!, "b")}
                      className="flex items-center gap-1.5 rounded-lg border border-app-border px-3 py-1.5 text-xs text-app-text hover:bg-app-card-hover transition-colors">
                      {copiedMessage === "b" ? <Check className="h-3.5 w-3.5 text-app-success" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedMessage === "b" ? "복사됨" : "복사"}
                    </button>
                  </div>
                </Panel>
              )}

              {result.reasoning && (
                <Panel title="💡 생성 이유">
                  <p className="text-xs text-app-text-muted whitespace-pre-wrap">{result.reasoning}</p>
                </Panel>
              )}
            </>
          )}
        </div>
      </div>
    </AiSubTabLayout>
  );
}