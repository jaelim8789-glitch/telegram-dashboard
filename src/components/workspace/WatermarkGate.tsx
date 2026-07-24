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
    text: `\n\n?â”?â”?â”?â”?â”?â”?â”?â”?â”\n?¤– AIê°€ ?ë™?¼ë¡œ ?µë??ˆìŠµ?ˆë‹¤. ë¬´ë£Œ AI ì§ì› ë°›ê¸°\n\n?Œ ${SITE_URL}/signup`,
    key: "default",
  },
  {
    text: `\n\n?â”?â”?â”?â”?â”?â”?â”?â”?â”\n?’¬ AI ë¹„ì„œê°€ ?€???µì¥?ˆì–´??\n\n?? ì§€ê¸?ë¬´ë£Œë¡??œì‘?˜ì„¸??n?Œ ${SITE_URL}/signup`,
    key: "ai_assistant",
  },
  {
    text: `\n\n?â”?â”?â”?â”?â”?â”?â”?â”?â”\n??ë°”ì  ??AI?ê²Œ ë§¡ê¸°?¸ìš”\n\n?¤– 24?œê°„ ?ë™ ?‘ë‹µ ë¬´ë£Œ ì²´í—˜\n?Œ ${SITE_URL}/signup`,
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
      .catch((e) => { console.error("[WatermarkGate] getMyReferralCode ?¤íŒ¨", e); toast("error", "ì¶”ì²œ??ì½”ë“œë¥?ë¶ˆëŸ¬?¤ì? ëª»í–ˆ?µë‹ˆ??); })
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
      .catch((e) => { console.error("[WatermarkGate] getReferralDashboard ?¤íŒ¨", e); toast("error", "ì¶”ì²œ ?µê³„ë¥?ë¶ˆëŸ¬?¤ì? ëª»í–ˆ?µë‹ˆ??); });
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
          toast("success", "?‰ ì¶•í•˜?©ë‹ˆ?? ì²?ì¶”ì²œ ?±ê³µ! ì»¤ë??˜ì´ ?ë¦½?˜ì—ˆ?µë‹ˆ??", { duration: 8000 });
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
    toast("success", `?Œí„°ë§ˆí¬ ë¬¸êµ¬ê°€ "${next.text.split('\n')[1]?.trim() ?? 'ë³€ê²?}"(??ë¡?ë³€ê²½ë˜?ˆìŠµ?ˆë‹¤.`);
  }

  async function handleCreateReferral() {
    setReferralCreating(true);
    try {
      const r = await generateReferralCode();
      if (r?.code) {
        setReferralCode(r.code);
        toast("success", "ì¶”ì²œ??ì½”ë“œê°€ ?ì„±?˜ì—ˆ?µë‹ˆ??");
        onReferralReady?.(r.code);
        // Refresh inflow stats
        getReferralDashboard().then((d) => setReferralInflow(d?.referred_users?.length ?? 0)).catch((e) => { console.error("[WatermarkGate] referral inflow refresh ?¤íŒ¨", e); toast("error", "ì¶”ì²œ ?µê³„ ê°±ì‹ ???¤íŒ¨?ˆìŠµ?ˆë‹¤"); });
      }
    } catch {
      toast("error", "ì¶”ì²œ??ì½”ë“œ ?ì„±???¤íŒ¨?ˆìŠµ?ˆë‹¤");
    } finally {
      setReferralCreating(false);
    }
  }

  function handleCopyReferral() {
    if (!referralCode) return;
    const link = `${SITE_URL}/signup?ref=${referralCode}`;
    navigator.clipboard.writeText(link).then(
      () => toast("success", "ì¶”ì²œ??ë§í¬ê°€ ë³µì‚¬?˜ì—ˆ?µë‹ˆ??"),
      () => toast("error", "ë³µì‚¬???¤íŒ¨?ˆìŠµ?ˆë‹¤"),
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
                  ?Œí„°ë§ˆí¬ ê´‘ê³ 
                </p>
                <p className="text-xs text-app-text-muted mt-0.5">
                  ë©”ì‹œì§€ ?˜ë‹¨??TeleMon ?ë³´ ë¬¸êµ¬ê°€ ?ë™ ì¶”ê??©ë‹ˆ??                </p>
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
                        ?Œí„°ë§ˆí¬ë¥?ì¼œì•¼ ë°œì†¡ ê°€?¥í•©?ˆë‹¤
                      </p>
                      <p className="text-[11px] text-app-text-muted mt-0.5">
                        ë¬´ë£Œ ?”ê¸ˆ?œì—?œëŠ” ?Œí„°ë§ˆí¬ ê´‘ê³ ê°€ ?¬í•¨???íƒœë¡œë§Œ ë©”ì‹œì§€ë¥?ë°œì†¡?????ˆìŠµ?ˆë‹¤.
                        ??? ê???ì¼œë©´ ?ë™?¼ë¡œ ?ìš©?©ë‹ˆ??
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
                    ?Œí„°ë§ˆí¬ ì¼œê³  ê³„ì†?˜ê¸°
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
                        <span>ì¶”ì²œ??ì½”ë“œ ?¤ì •</span>
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
                                <span className="text-xs text-app-text-muted">ì¶”ì²œ???•ë³´ ?•ì¸ ì¤?..</span>
                              </div>
                            ) : referralCode ? (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between rounded-lg bg-app-card-hover px-3 py-2">
                                  <div className="min-w-0">
                                    <p className="text-[11px] text-app-text-muted">??ì¶”ì²œ??ì½”ë“œ</p>
                                    <p className="text-sm font-mono font-semibold text-app-text">{referralCode}</p>
                                  </div>
                                  <Button variant="ghost" size="sm" onClick={handleCopyReferral} className="shrink-0">
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                                <p className="text-[10px] text-app-text-subtle">
                                  ??ì½”ë“œê°€ ?Œí„°ë§ˆí¬???ë™ ?¬í•¨?©ë‹ˆ?? ì¹œêµ¬ê°€ ê°€?…í•˜ë©?ì»¤ë??˜ì„ ë°›ì„ ???ˆì–´??
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-xs text-app-text-muted">
                                  ?„ì§ ì¶”ì²œ??ì½”ë“œê°€ ?†ìŠµ?ˆë‹¤. ì§€ê¸??ì„±?˜ê³  ì¹œêµ¬ë¥?ì´ˆë??´ë³´?¸ìš”!
                                </p>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  loading={referralCreating}
                                  onClick={handleCreateReferral}
                                  className="w-full"
                                >
                                  <Gift className="h-3.5 w-3.5" />
                                  ì¶”ì²œ??ì½”ë“œ ?ì„±?˜ê¸°
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
                ?´ë²ˆ ???Œí„°ë§ˆí¬ ? ì…:{' '}
                <span className="font-semibold text-app-text tabular-nums">{referralInflow}ëª?/span>
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
                  ì¶”ì²œ??ì½”ë“œ <code className="rounded bg-app-card-hover px-1 py-0.5 font-mono text-[11px] text-app-text">{referralCode}</code>ê°€ ?Œí„°ë§ˆí¬???¬í•¨?©ë‹ˆ??                </span>
                <button
                  type="button"
                  onClick={handleCopyReferral}
                  className="shrink-0 rounded p-1 text-app-text-subtle hover:text-app-text hover:bg-app-card-hover transition-colors"
                  title="ì¶”ì²œ??ë§í¬ ë³µì‚¬"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* A/B variant cycle */}
            <div className="flex items-center gap-2 px-3 py-2">
              <TrendingUp className="h-3.5 w-3.5 text-app-text-muted" />
              <span className="text-xs text-app-text-muted flex-1">
                ?Œí„°ë§ˆí¬: <span className="text-app-text">{currentVariant.text.split('\n')[1]?.trim() ?? 'ê¸°ë³¸'}</span>
              </span>
              <button
                type="button"
                onClick={cycleVariant}
                className="shrink-0 rounded-lg border border-app-border px-2 py-1 text-[10px] font-medium text-app-primary hover:bg-app-primary/10 transition-colors"
              >
                A/B ?ŒìŠ¤??              </button>
            </div>

            {/* Upgrade nudge ??dismissable */}
            {!upgradeHintDismissed && (
              <div className="flex items-start gap-2 px-3 py-2.5">
                <Crown className="h-3.5 w-3.5 text-app-warning mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-app-text-muted">
                    ? ë£Œ ?„í™˜?˜ë©´ ?Œí„°ë§ˆí¬ ?†ì´ ë°œì†¡ ê°€??
                    <button
                      type="button"
                      onClick={() => {
                        setUpgradeHintDismissed(true);
                        try { localStorage.setItem("telemon-upgrade-hint-dismissed", "true"); } catch (e) { console.warn('Unhandled error in WatermarkGate', e) }
                      }}
                      className="ml-1.5 text-[10px] text-app-text-subtle hover:text-app-text-muted underline"
                    >
                      ?«ê¸°
                    </button>
                  </p>
                  <a
                    href="/pricing"
                    className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-app-primary hover:underline"
                  >
                    <Sparkles className="h-3 w-3" /> ?”ê¸ˆ??ë³´ê¸°
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
