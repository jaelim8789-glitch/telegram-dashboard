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
    text: `\n\n?━?━?━?━?━?━?━?━?━\n? AI가 ?동?로 ???습?다. 무료 AI 직원 받기\n\n? ${SITE_URL}/signup`,
    key: "default",
  },
  {
    text: `\n\n?━?━?━?━?━?━?━?━?━\n? AI 비서가 ????장?어??\n\n?? 지?무료??작?세??n? ${SITE_URL}/signup`,
    key: "ai_assistant",
  },
  {
    text: `\n\n?━?━?━?━?━?━?━?━?━\n??바쁠 ??AI?게 맡기?요\n\n? 24?간 ?동 ?답 무료 체험\n? ${SITE_URL}/signup`,
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
      .catch((e) => { console.error("[WatermarkGate] getMyReferralCode ?패", e); toast("error", "추천??코드?불러?? 못했?니??); })
      .finally(() => setReferralLoading(false));
  }, [token]);

  // Referral dashboard ??fetch inflow count when watermark is ON
  useEffect(() => {
    if (!token || !watermarkOn || !isFree) return;
    getReferralDashboard()
      .then((d) => {
        if (d?.referred_users) setReferralInflow(d.referred_users.length);
        else setReferralInflow(0);
      })
      .catch((e) => { console.error("[WatermarkGate] getReferralDashboard ?패", e); toast("error", "추천 ?계?불러?? 못했?니??); });
  }, [token, watermarkOn, isFree]);

  // First referral success toast
  useEffect(() => {
    if (!token || !referralCode || !watermarkOn) return;
    try {
      if (localStorage.getItem(REFERRAL_NOTIFIED_KEY) === "true") return;
    } catch (e) { console.warn('Unhandled error in WatermarkGate', e) }
    let cancelled = false;
    const check = async () => {
      try {
        const d = await getReferralDashboard();
        if (cancelled) return;
        if ((d?.referred_users?.length ?? 0) > 0) {
          toast("success", "? 축하?니?? ?추천 ?공! 커??이 ?립?었?니??", { duration: 8000 });
          try { localStorage.setItem(REFERRAL_NOTIFIED_KEY, "true"); } catch (e) { console.warn('Unhandled error in WatermarkGate', e) }
        }
      } catch (e) { console.warn('Unhandled error in WatermarkGate', e) }
    };
    const timer = setTimeout(check, 5000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [token, referralCode, watermarkOn, toast]);

  function toggleWatermark(next: boolean) {
    setWatermarkOn(next);
    try { localStorage.setItem(WM_ON_KEY, next ? "true" : "false"); } catch (e) { console.warn('Unhandled error in WatermarkGate', e) }
    if (next) onWatermarkEnabled?.();
  }

  function cycleVariant() {
    const currentIdx = WATERMARK_VARIANTS.findIndex((v) => v.key === variantKey);
    const next = WATERMARK_VARIANTS[(currentIdx + 1) % WATERMARK_VARIANTS.length];
    setVariantKey(next.key);
    try { localStorage.setItem(WM_STORAGE_KEY, next.key); } catch (e) { console.warn('Unhandled error in WatermarkGate', e) }
    toast("success", `?터마크 문구가 "${next.text.split('\n')[1]?.trim() ?? '변?}"(???변경되?습?다.`);
  }

  async function handleCreateReferral() {
    setReferralCreating(true);
    try {
      const r = await generateReferralCode();
      if (r?.code) {
        setReferralCode(r.code);
        toast("success", "추천??코드가 ?성?었?니??");
        onReferralReady?.(r.code);
        // Refresh inflow stats
        getReferralDashboard().then((d) => setReferralInflow(d?.referred_users?.length ?? 0)).catch((e) => { console.error("[WatermarkGate] referral inflow refresh ?패", e); toast("error", "추천 ?계 갱신???패?습?다"); });
      }
    } catch {
      toast("error", "추천??코드 ?성???패?습?다");
    } finally {
      setReferralCreating(false);
    }
  }

  function handleCopyReferral() {
    if (!referralCode) return;
    const link = `${SITE_URL}/signup?ref=${referralCode}`;
    navigator.clipboard.writeText(link).then(
      () => toast("success", "추천??링크가 복사?었?니??"),
      () => toast("error", "복사???패?습?다"),
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
                  ?터마크 광고
                </p>
                <p className="text-xs text-app-text-muted mt-0.5">
                  메시지 ?단??TeleMon ?보 문구가 ?동 추??니??                </p>
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

          {/* Gate ??shown when free plan and watermark is OFF */}
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
                        ?터마크?켜야 발송 가?합?다
                      </p>
                      <p className="text-[11px] text-app-text-muted mt-0.5">
                        무료 ?금?에?는 ?터마크 광고가 ?함???태로만 메시지?발송?????습?다.
                        ??????켜면 ?동?로 ?용?니??
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
                    ?터마크 켜고 계속?기
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
                        <span>추천??코드 ?정</span>
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
                                <span className="text-xs text-app-text-muted">추천???보 ?인 ?..</span>
                              </div>
                            ) : referralCode ? (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between rounded-lg bg-app-card-hover px-3 py-2">
                                  <div className="min-w-0">
                                    <p className="text-[11px] text-app-text-muted">??추천??코드</p>
                                    <p className="text-sm font-mono font-semibold text-app-text">{referralCode}</p>
                                  </div>
                                  <Button variant="ghost" size="sm" onClick={handleCopyReferral} className="shrink-0">
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                                <p className="text-[10px] text-app-text-subtle">
                                  ??코드가 ?터마크???동 ?함?니?? 친구가 가?하?커??을 받을 ???어??
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-xs text-app-text-muted">
                                  ?직 추천??코드가 ?습?다. 지??성?고 친구?초??보?요!
                                </p>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  loading={referralCreating}
                                  onClick={handleCreateReferral}
                                  className="w-full"
                                >
                                  <Gift className="h-3.5 w-3.5" />
                                  추천??코드 ?성?기
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

      {/* When watermark is ON ??show growth stats + A/B test + upgrade nudge */}
      {watermarkOn && isFree && !showGate && (
        <div className="space-y-2">
          {/* Referral inflow counter */}
          {referralInflow !== null && (
            <div className="flex items-center gap-2 rounded-lg border border-app-border/50 bg-app-card/30 px-3 py-2">
              <Users className="h-3.5 w-3.5 text-app-primary" />
              <span className="text-xs text-app-text-muted flex-1">
                ?번 ???터마크 ?입:{' '}
                <span className="font-semibold text-app-text tabular-nums">{referralInflow}?/span>
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
                  추천??코드 <code className="rounded bg-app-card-hover px-1 py-0.5 font-mono text-[11px] text-app-text">{referralCode}</code>가 ?터마크???함?니??                </span>
                <button
                  type="button"
                  onClick={handleCopyReferral}
                  className="shrink-0 rounded p-1 text-app-text-subtle hover:text-app-text hover:bg-app-card-hover transition-colors"
                  title="추천??링크 복사"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* A/B variant cycle */}
            <div className="flex items-center gap-2 px-3 py-2">
              <TrendingUp className="h-3.5 w-3.5 text-app-text-muted" />
              <span className="text-xs text-app-text-muted flex-1">
                ?터마크: <span className="text-app-text">{currentVariant.text.split('\n')[1]?.trim() ?? '기본'}</span>
              </span>
              <button
                type="button"
                onClick={cycleVariant}
                className="shrink-0 rounded-lg border border-app-border px-2 py-1 text-[10px] font-medium text-app-primary hover:bg-app-primary/10 transition-colors"
              >
                A/B ?스??              </button>
            </div>

            {/* Upgrade nudge ??dismissable */}
            {!upgradeHintDismissed && (
              <div className="flex items-start gap-2 px-3 py-2.5">
                <Crown className="h-3.5 w-3.5 text-app-warning mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-app-text-muted">
                    ?료 ?환?면 ?터마크 ?이 발송 가??
                    <button
                      type="button"
                      onClick={() => {
                        setUpgradeHintDismissed(true);
                        try { localStorage.setItem("telemon-upgrade-hint-dismissed", "true"); } catch (e) { console.warn('Unhandled error in WatermarkGate', e) }
                      }}
                      className="ml-1.5 text-[10px] text-app-text-subtle hover:text-app-text-muted underline"
                    >
                      ?기
                    </button>
                  </p>
                  <a
                    href="/pricing"
                    className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-app-primary hover:underline"
                  >
                    <Sparkles className="h-3 w-3" /> ?금??보기
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
