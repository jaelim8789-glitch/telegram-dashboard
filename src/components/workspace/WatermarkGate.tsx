"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, Loader2, AlertTriangle, Gift, Copy,
  ChevronDown, ChevronUp, Share2, FileWarning, Users, TrendingUp, Crown, Sparkles,
} from "lucide-react";
import { getToken } from "@/lib/auth";
import { getMyReferralCode, generateReferralCode, getReferralDashboard } from "@/lib/api_referral";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://telemon.online";

const WATERMARK_VARIANTS = [
  {
    text: `\n\n━━━━━━━━━━━━━━━━━━\n🤖 AI가 자동으로 답변했습니다. 무료 AI 직원 받기\n\n🌐 ${SITE_URL}/signup`,
    key: "default",
  },
  {
    text: `\n\n━━━━━━━━━━━━━━━━━━\n💬 AI 비서가 대신 답장했어요!\n\n🚀 지금 무료로 시작하세요\n🌐 ${SITE_URL}/signup`,
    key: "ai_assistant",
  },
  {
    text: `\n\n━━━━━━━━━━━━━━━━━━\n⏰ 바쁠 땐 AI에게 맡기세요\n\n🤖 24시간 자동 응답 무료 체험\n🌐 ${SITE_URL}/signup`,
    key: "busy",
  },
];

const WM_STORAGE_KEY = "telemon_watermark_variant";
const WM_ON_KEY = "telemon_watermark_on";
const REFERRAL_NOTIFIED_KEY = "telemon_referral_first_toast";

const ROTATION_INTERVAL_DAYS = 7;

function pickInitialVariant(): string {
  if (typeof window === "undefined") return "default";
  try {
    const saved = localStorage.getItem(WM_STORAGE_KEY);
    if (saved) return saved;
    const idx = Math.floor(Math.random() * WATERMARK_VARIANTS.length);
    const chosen = WATERMARK_VARIANTS[idx].key;
    localStorage.setItem(WM_STORAGE_KEY, chosen);
    return chosen;
  } catch { return "default"; }
}

interface WatermarkGateProps {
  plan: string | null;
  onWatermarkEnabled?: () => void;
  onReferralReady?: (code: string) => void;
  compact?: boolean;
}

export function WatermarkGate({ plan, onWatermarkEnabled, onReferralReady, compact }: WatermarkGateProps) {
  const { toast } = useToast();
  const token = getToken();

  const [watermarkOn, setWatermarkOn] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return localStorage.getItem(WM_ON_KEY) === "true"; } catch { return false; }
  });

  const [variantKey, setVariantKey] = useState(pickInitialVariant);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralCreating, setReferralCreating] = useState(false);
  const [referralInflow, setReferralInflow] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [upgradeHintDismissed, setUpgradeHintDismissed] = useState(() => {
    try { return localStorage.getItem("telemon-upgrade-hint-dismissed") === "true"; } catch { return false; }
  });

  const isFree = plan === "free";

  useEffect(() => {
    if (!token) return;
    setReferralLoading(true);
    getMyReferralCode()
      .then((r) => { if (r?.code) setReferralCode(r.code); })
      .catch((e) => console.warn("WatermarkGate: getMyReferralCode 실패", e))
      .finally(() => setReferralLoading(false));
  }, [token]);

  // Referral dashboard — fetch inflow count when watermark is ON
  useEffect(() => {
    if (!token || !watermarkOn || !isFree) return;
    getReferralDashboard()
      .then((d) => {
        if (d?.referred_users) setReferralInflow(d.referred_users.length);
        else setReferralInflow(0);
      })
      .catch((e) => console.warn("WatermarkGate: getReferralDashboard 실패", e));
  }, [token, watermarkOn, isFree]);

  // First referral success toast
  useEffect(() => {
    if (!token || !referralCode || !watermarkOn) return;
    try {
      if (localStorage.getItem(REFERRAL_NOTIFIED_KEY) === "true") return;
    } catch {}
    let cancelled = false;
    const check = async () => {
      try {
        const d = await getReferralDashboard();
        if (cancelled) return;
        if ((d?.referred_users?.length ?? 0) > 0) {
          toast("success", "🎉 축하합니다! 첫 추천 성공! 커미션이 적립되었습니다.", { duration: 8000 });
          try { localStorage.setItem(REFERRAL_NOTIFIED_KEY, "true"); } catch {}
        }
      } catch {}
    };
    const timer = setTimeout(check, 5000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [token, referralCode, watermarkOn, toast]);

  function toggleWatermark(next: boolean) {
    setWatermarkOn(next);
    try { localStorage.setItem(WM_ON_KEY, next ? "true" : "false"); } catch {}
    if (next) onWatermarkEnabled?.();
  }

  function cycleVariant() {
    const currentIdx = WATERMARK_VARIANTS.findIndex((v) => v.key === variantKey);
    const next = WATERMARK_VARIANTS[(currentIdx + 1) % WATERMARK_VARIANTS.length];
    setVariantKey(next.key);
    try { localStorage.setItem(WM_STORAGE_KEY, next.key); } catch {}
    toast("success", `워터마크 문구가 "${next.text.split('\n')[1]?.trim() ?? '변경'}"(으)로 변경되었습니다.`);
  }

  async function handleCreateReferral() {
    setReferralCreating(true);
    try {
      const r = await generateReferralCode();
      if (r?.code) {
        setReferralCode(r.code);
        toast("success", "추천인 코드가 생성되었습니다!");
        onReferralReady?.(r.code);
        // Refresh inflow stats
        getReferralDashboard().then((d) => setReferralInflow(d?.referred_users?.length ?? 0)).catch((e) => console.warn("WatermarkGate: referral inflow refresh 실패", e));
      }
    } catch {
      toast("error", "추천인 코드 생성에 실패했습니다");
    } finally {
      setReferralCreating(false);
    }
  }

  function handleCopyReferral() {
    if (!referralCode) return;
    const link = `${SITE_URL}/signup?ref=${referralCode}`;
    navigator.clipboard.writeText(link).then(
      () => toast("success", "추천인 링크가 복사되었습니다!"),
      () => toast("error", "복사에 실패했습니다"),
    );
  }

  const showGate = isFree && !watermarkOn;
  const currentVariant = WATERMARK_VARIANTS.find((v) => v.key === variantKey) ?? WATERMARK_VARIANTS[0];

  return (
    <div className={cn("space-y-3", compact ? "text-sm" : "")}>
      <div className={cn(
        "rounded-xl border transition-colors",
        showGate ? "border-amber-500/40 bg-amber-500/5" : "border-app-border bg-app-card/50"
      )}>
        <div className="p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                showGate ? "bg-amber-500/15" : "bg-app-card-hover"
              )}>
                <FileWarning className={cn("h-4 w-4", showGate ? "text-amber-500" : "text-app-text-muted")} />
              </div>
              <div className="min-w-0">
                <p className={cn("text-sm font-medium", showGate ? "text-amber-500" : "text-app-text")}>
                  워터마크 광고
                </p>
                <p className="text-xs text-app-text-muted mt-0.5">
                  메시지 하단에 TeleMon 홍보 문구가 자동 추가됩니다
                </p>
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center shrink-0">
              <input
                type="checkbox"
                checked={watermarkOn}
                onChange={(e) => toggleWatermark(e.target.checked)}
                className="peer sr-only"
              />
              <div className={cn(
                "h-5 w-9 rounded-full transition-colors peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-app-primary/50",
                watermarkOn ? "bg-app-primary" : "bg-app-border-strong"
              )}>
                <div className={cn(
                  "h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                  watermarkOn ? "translate-x-[18px]" : "translate-x-[2px]"
                )} />
              </div>
            </label>
          </div>

          {/* Gate — shown when free plan and watermark is OFF */}
          <AnimatePresence initial={false}>
            {showGate && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-3 border-t border-amber-500/20 pt-3">
                  <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                        워터마크를 켜야 발송 가능합니다
                      </p>
                      <p className="text-[11px] text-app-text-muted mt-0.5">
                        무료 요금제에서는 워터마크 광고가 포함된 상태로만 메시지를 발송할 수 있습니다.
                        위 토글을 켜면 자동으로 적용됩니다.
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => toggleWatermark(true)}
                    className="w-full"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    워터마크 켜고 계속하기
                  </Button>

                  {/* Referral Section */}
                  <div className="rounded-lg border border-app-border/50 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpanded(!expanded)}
                      className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-app-text-muted hover:bg-app-card-hover transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <Gift className="h-3.5 w-3.5 text-app-primary" />
                        <span>추천인 코드 설정</span>
                      </div>
                      {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>

                    <AnimatePresence initial={false}>
                      {expanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-app-border/30 px-3 py-2.5 space-y-2">
                            {referralLoading ? (
                              <div className="flex items-center gap-2 py-2">
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-app-text-muted" />
                                <span className="text-xs text-app-text-muted">추천인 정보 확인 중...</span>
                              </div>
                            ) : referralCode ? (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between rounded-lg bg-app-card-hover px-3 py-2">
                                  <div className="min-w-0">
                                    <p className="text-[11px] text-app-text-muted">내 추천인 코드</p>
                                    <p className="text-sm font-mono font-semibold text-app-text">{referralCode}</p>
                                  </div>
                                  <Button variant="ghost" size="sm" onClick={handleCopyReferral} className="shrink-0">
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                                <p className="text-[10px] text-app-text-subtle">
                                  이 코드가 워터마크에 자동 포함됩니다. 친구가 가입하면 커미션을 받을 수 있어요!
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-xs text-app-text-muted">
                                  아직 추천인 코드가 없습니다. 지금 생성하고 친구를 초대해보세요!
                                </p>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  loading={referralCreating}
                                  onClick={handleCreateReferral}
                                  className="w-full"
                                >
                                  <Gift className="h-3.5 w-3.5" />
                                  추천인 코드 생성하기
                                </Button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* When watermark is ON — show growth stats + A/B test + upgrade nudge */}
      {watermarkOn && isFree && !showGate && (
        <div className="space-y-2">
          {/* Referral inflow counter */}
          {referralInflow !== null && (
            <div className="flex items-center gap-2 rounded-lg border border-app-border/50 bg-app-card/30 px-3 py-2">
              <Users className="h-3.5 w-3.5 text-app-primary" />
              <span className="text-xs text-app-text-muted flex-1">
                이번 달 워터마크 유입:{' '}
                <span className="font-semibold text-app-text tabular-nums">{referralInflow}명</span>
              </span>
            </div>
          )}

          {/* Referral code + A/B test + upgrade nudge row */}
          <div className="rounded-lg border border-app-border/50 bg-app-card/30 divide-y divide-app-border/30">
            {/* Referral code line (if exists) */}
            {referralCode && (
              <div className="flex items-center gap-2 px-3 py-2">
                <Share2 className="h-3.5 w-3.5 text-app-text-muted" />
                <span className="text-xs text-app-text-muted flex-1">
                  추천인 코드 <code className="rounded bg-app-card-hover px-1 py-0.5 font-mono text-[11px] text-app-text">{referralCode}</code>가 워터마크에 포함됩니다
                </span>
                <button
                  type="button"
                  onClick={handleCopyReferral}
                  className="shrink-0 rounded p-1 text-app-text-subtle hover:text-app-text hover:bg-app-card-hover transition-colors"
                  title="추천인 링크 복사"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* A/B variant cycle */}
            <div className="flex items-center gap-2 px-3 py-2">
              <TrendingUp className="h-3.5 w-3.5 text-app-text-muted" />
              <span className="text-xs text-app-text-muted flex-1">
                워터마크: <span className="text-app-text">{currentVariant.text.split('\n')[1]?.trim() ?? '기본'}</span>
              </span>
              <button
                type="button"
                onClick={cycleVariant}
                className="shrink-0 rounded-lg border border-app-border px-2 py-1 text-[10px] font-medium text-app-primary hover:bg-app-primary/10 transition-colors"
              >
                A/B 테스트
              </button>
            </div>

            {/* Upgrade nudge — dismissable */}
            {!upgradeHintDismissed && (
              <div className="flex items-start gap-2 px-3 py-2.5">
                <Crown className="h-3.5 w-3.5 text-app-warning mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-app-text-muted">
                    유료 전환하면 워터마크 없이 발송 가능!
                    <button
                      type="button"
                      onClick={() => {
                        setUpgradeHintDismissed(true);
                        try { localStorage.setItem("telemon-upgrade-hint-dismissed", "true"); } catch {}
                      }}
                      className="ml-1.5 text-[10px] text-app-text-subtle hover:text-app-text-muted underline"
                    >
                      닫기
                    </button>
                  </p>
                  <a
                    href="/pricing"
                    className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-app-primary hover:underline"
                  >
                    <Sparkles className="h-3 w-3" /> 요금제 보기
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
