"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Star, TrendingUp, Users, MessageSquare, Send,
  Calendar, AlertTriangle, CheckCircle2, Clock, Coins,
  Heart, Brain, Sun, Moon, Loader2, RefreshCw, Copy, Check,
  ChevronRight, Share2, ChevronDown, ChevronUp,
} from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { InlineError } from "@/components/ui/InlineError";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { getToken } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

interface FortuneResponse {
  date: string;
  zodiac: string;
  grade: string;
  summary: string;
  scores: {
    사업운: number;
    재물운: number;
    대인운: number;
    건강운: number;
    커뮤니케이션운: number;
  };
  overall_score: number;
  advice: {
    broadcast_best_time: string;
    group_engage_time: string;
    reply_peak_time: string;
  };
  lucky_keywords: string[];
  avoid_today: string[];
  core_missions: string[];
  weekly: { trend: string; focus: string; risk: string };
  monthly: { overall_mood: string; peak_week: number; opportunity: string };
  lucky_numbers: number[];
  lucky_colors: string[];
  generated_at: string;
}

const SCORE_LABELS: Record<string, { label: string; icon: typeof Star; color: string }> = {
  사업운: { label: "사업운", icon: TrendingUp, color: "text-blue-500" },
  재물운: { label: "재물운", icon: Coins, color: "text-yellow-500" },
  대인운: { label: "대인운", icon: Users, color: "text-green-500" },
  건강운: { label: "건강운", icon: Heart, color: "text-red-500" },
  커뮤니케이션운: { label: "커뮤니케이션운", icon: MessageSquare, color: "text-purple-500" },
};

function ScoreBar({ name, score }: { name: string; score: number }) {
  const meta = SCORE_LABELS[name] ?? { label: name, icon: Star, color: "text-gray-500" };
  const Icon = meta.icon;
  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-3.5 w-3.5 shrink-0 ${meta.color}`} />
      <span className="w-24 text-[11px] text-app-text-muted shrink-0">{meta.label}</span>
      <div className="flex-1 h-2 rounded-full bg-app-border overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full rounded-full ${score >= 80 ? "bg-green-500" : score >= 60 ? "bg-yellow-500" : "bg-orange-500"}`}
        />
      </div>
      <span className="w-8 text-right text-[11px] font-semibold text-app-text">{score}</span>
    </div>
  );
}

function TimeBadge({ label, time, icon: Icon }: { label: string; time: string; icon: typeof Clock }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-app-primary/20 bg-app-primary-muted/10 px-3 py-2.5">
      <Icon className="h-4 w-4 text-app-primary shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-app-text-muted">{label}</p>
        <p className="text-sm font-semibold text-app-text">{time}</p>
      </div>
    </div>
  );
}

export function FortuneTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [fortune, setFortune] = useState<FortuneResponse | null>(null);
  const [birthDate, setBirthDate] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("fortune_birth") || "";
    return "";
  });
  const [showBirthInput, setShowBirthInput] = useState(!birthDate);
  const [copied, setCopied] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const loadFortune = useCallback(async (birth?: string) => {
    setLoading(true);
    try {
      const token = getToken();
      const params = birth ? `?birth_date=${birth}` : "";
      const res = await fetch(`${API_BASE}/api/fortune/daily${params}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFortune(data);
    } catch {
      toast("error", "운세를 불러올 수 없습니다");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadFortune(birthDate || undefined);
  }, [loadFortune, birthDate]);

  const handleBirthSubmit = () => {
    const stored = localStorage.getItem("fortune_birth");
    if (birthDate !== stored) {
      localStorage.setItem("fortune_birth", birthDate);
    }
    setShowBirthInput(false);
    loadFortune(birthDate || undefined);
  };

  const handleCopy = () => {
    if (!fortune) return;
    const text = `🪄 ${fortune.date} ${fortune.zodiac} ${fortune.grade}\n\n${fortune.summary}\n\n📊 종합점수: ${fortune.overall_score}점\n💼 사업운: ${fortune.scores.사업운}점 | 💰 재물운: ${fortune.scores.재물운}점\n👥 대인운: ${fortune.scores.대인운}점\n\n📡 오늘의 발송 최적 시간\n📨 브로드캐스트: ${fortune.advice.broadcast_best_time}\n👥 그룹 참여: ${fortune.advice.group_engage_time}\n💬 답장 최적: ${fortune.advice.reply_peak_time}\n\n🏆 오늘의 미션\n${fortune.core_missions.map((m, i) => `${i+1}. ${m}`).join("\n")}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast("success", "운세가 복사되었습니다");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading && !fortune) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-1">
      {/* 생년월일 입력 */}
      <AnimatePresence>
        {showBirthInput && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Panel title="🎂 생년월일 입력" description="더 정확한 맞춤 운세를 위해 생년월일을 입력해주세요">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="flex-1 rounded-lg border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text focus:outline-none focus:border-app-primary"
                />
                <Button onClick={handleBirthSubmit} variant="primary" size="sm">설정 완료</Button>
                <Button onClick={() => { setShowBirthInput(false); loadFortune(); }} variant="ghost" size="sm">건너뛰기</Button>
              </div>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>

      {fortune && (
        <>
          {/* 헤더 운세 카드 */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Panel>
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-600/20 via-blue-600/10 to-purple-600/20 border border-purple-500/20 p-4">
                {/* 배경 별 효과 */}
                <div className="absolute inset-0 opacity-10">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <Star key={`fortune-star-${i}`} className="absolute text-yellow-400" style={{
                      top: `${Math.random() * 100}%`,
                      left: `${Math.random() * 100}%`,
                      fontSize: `${Math.random() * 12 + 6}px`,
                      opacity: Math.random() * 0.8 + 0.2,
                    }} />
                  ))}
                </div>

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="h-4 w-4 text-purple-400" />
                        <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">
                          {fortune.zodiac} · {fortune.date}
                        </span>
                      </div>
                      <h2 className="text-xl font-bold text-app-text">{fortune.grade}</h2>
                      <p className="text-xs text-app-text-secondary mt-1">{fortune.summary}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button onClick={handleCopy} variant="ghost" size="sm" className="h-8 w-8">
                        {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                      <Button onClick={() => loadFortune(birthDate || undefined)} variant="ghost" size="sm" className="h-8 w-8" disabled={loading}>
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                      </Button>
                    </div>
                  </div>

                  {/* 점수 영역 */}
                  <div className="space-y-1.5">
                    {Object.entries(fortune.scores).map(([name, score]) => (
                      <ScoreBar key={name} name={name} score={score} />
                    ))}
                    <div className="flex justify-end mt-1">
                      <span className="text-[10px] text-app-text-muted">
                        종합점수 <strong className="text-app-text">{fortune.overall_score}</strong>/100
                      </span>
                    </div>
                  </div>

                  {/* 행운 키워드 */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {fortune.lucky_keywords.map((kw) => (
                      <span key={kw} className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-0.5 text-[10px] font-medium text-yellow-600">
                        <Star className="h-2.5 w-2.5" /> {kw}
                      </span>
                    ))}
                    {fortune.lucky_colors.map((c) => (
                      <span key={c} className="rounded-full bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 text-[10px] text-purple-600">
                        🎨 {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Panel>
          </motion.div>

          {/* 오늘의 발송 최적 시간 */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Panel title="📡 오늘의 발송 최적 시간" description="별자리 에너지가 가장 강한 시간대">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <TimeBadge label="📨 브로드캐스트" time={fortune.advice.broadcast_best_time} icon={Send} />
                <TimeBadge label="👥 그룹 참여" time={fortune.advice.group_engage_time} icon={Users} />
                <TimeBadge label="💬 답장 최적" time={fortune.advice.reply_peak_time} icon={MessageSquare} />
              </div>
            </Panel>
          </motion.div>

          {/* 오늘의 미션 */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Panel title="🏆 오늘의 핵심 미션" description="운세 기반 추천 액션 아이템">
              <div className="space-y-2">
                {fortune.core_missions.map((mission, i) => (
                  <div key={`mission-${i}`} className="flex items-start gap-2 rounded-lg border border-app-border bg-app-card/50 p-2.5">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-app-primary/10 text-[10px] font-bold text-app-primary">
                      {i + 1}
                    </div>
                    <p className="text-xs text-app-text">{mission}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </motion.div>

          {/* 오늘 피해야 할 행동 + 주간/월간 전망 */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Panel title="🚨 오늘 피해야 할 행동" description="별자리 흐름에 따른 주의사항">
              <div className="space-y-2">
                {fortune.avoid_today.map((item, i) => (
                  <div key={`avoid-${i}`} className="flex items-start gap-2 text-xs text-app-text">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-orange-500" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </motion.div>

          {/* 접기 가능한 추가 섹션 */}
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex w-full items-center justify-center gap-1 py-2 text-xs text-app-text-muted hover:text-app-text transition-colors"
          >
            {showAll ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showAll ? "접기" : "이번 주 운세 & 이번 달 전망 더보기"}
          </button>

          <AnimatePresence>
            {showAll && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-4">
                {/* 이번 주 전망 */}
                <Panel title="📈 이번 주 운세 리포트">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3 text-center">
                      <p className="text-[10px] text-green-600 font-semibold">트렌드</p>
                      <p className="text-lg font-bold text-app-text">{fortune.weekly.trend}</p>
                    </div>
                    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-center">
                      <p className="text-[10px] text-blue-600 font-semibold">집중 분야</p>
                      <p className="text-lg font-bold text-app-text">{fortune.weekly.focus}</p>
                    </div>
                    <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3 text-center">
                      <p className="text-[10px] text-orange-600 font-semibold">주의</p>
                      <p className="text-lg font-bold text-app-text">{fortune.weekly.risk}</p>
                    </div>
                  </div>
                </Panel>

                {/* 이번 달 전망 */}
                <Panel title="📆 이번 달 사업 흐름 분석">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-semibold text-app-text">{fortune.monthly.overall_mood}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-app-text-muted">
                      <Calendar className="h-3.5 w-3.5" />
                      최적의 주: <strong className="text-app-text">{fortune.monthly.peak_week}주차</strong>
                    </div>
                    <div className="rounded-lg border border-app-border bg-app-card/50 p-3">
                      <p className="text-xs text-app-text">
                        <Brain className="h-3.5 w-3.5 inline mr-1 text-app-primary" />
                        {fortune.monthly.opportunity}
                      </p>
                    </div>
                  </div>
                </Panel>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
