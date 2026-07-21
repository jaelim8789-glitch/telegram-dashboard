"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  X,
  ArrowUpRight,
  Loader2,
  ExternalLink,
  Crown,
  Star,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";

/* ────────────────────────────────────────────────────────────────── */

interface PlanInfo {
  id: string;
  name: string;
  description: string;
  features: string[];
  price_usdt: number;
  billing_interval: string;
  billing_label: string;
}

interface PlansResponse {
  plans: PlanInfo[];
  payment_methods: string[];
}

interface PlanUpgradeModalProps {
  open: boolean;
  onClose: () => void;
  currentPlan?: string;
  currentAccountCount?: number;
}

/* ────────────────────────────────────────────────────────────────── */

export function PlanUpgradeModal({
  open,
  onClose,
  currentPlan = "free",
  currentAccountCount = 0,
}: PlanUpgradeModalProps) {
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Load plans ───────────────────────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelectedPlan(null);
    setCheckoutUrl(null);
    setError(null);

    fetch("/api/billing/plans")
      .then((r) => r.json())
      .then((data: PlansResponse) => {
        setPlans(data.plans.filter((p) => p.id !== "free"));
      })
      .catch(() => setError("요금제 정보를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [open]);

  /* ── Create NOWPayments invoice ──────────────────────────────── */
  const handleUpgrade = useCallback(
    async (planId: string) => {
      setSelectedPlan(planId);
      setCreatingInvoice(true);
      setError(null);

      try {
        const plan = plans.find((p) => p.id === planId);
        if (!plan) throw new Error("Plan not found");

        const res = await fetch("/api/payments/nowpayments/create-invoice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan: planId,
            amount: plan.price_usdt,
            currency: "USDT",
            description: `TeleMon ${plan.name} — ${plan.billing_label}간`,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || "결제 인보이스 생성에 실패했습니다.");
        }

        const data = await res.json();
        if (data.invoice_url) {
          window.open(data.invoice_url, "_blank", "noopener,noreferrer");
          setCheckoutUrl(data.invoice_url);
        } else {
          setCheckoutUrl(data.invoice_url || null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "알 수 없는 오류");
      } finally {
        setCreatingInvoice(false);
      }
    },
    [plans],
  );

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-app-border bg-app-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Header ──────────────────────────────────────── */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-app-text-muted hover:bg-app-border hover:text-app-text transition-colors"
              aria-label="닫기"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-app-primary/10">
                <Crown className="h-5 w-5 text-app-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-app-text">요금제 업그레이드</h2>
                <p className="text-sm text-app-text-muted">
                  현재 요금제로 계정 {currentAccountCount}개 사용 중 · 한도 초과
                </p>
              </div>
            </div>

            {/* ── Error ─────────────────────────────────────────── */}
            {error && (
              <div className="mb-4 rounded-xl border border-app-danger/20 bg-app-danger-muted px-4 py-3 text-sm text-app-danger">
                {error}
              </div>
            )}

            {/* ── Loading ──────────────────────────────────────── */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-app-primary" />
                <span className="ml-3 text-sm text-app-text-muted">요금제 정보 불러오는 중...</span>
              </div>
            ) : (
              /* ── Plan Cards ──────────────────────────────────── */
              <div className="grid gap-4 sm:grid-cols-2">
                {plans.map((plan) => {
                  const isSelected = selectedPlan === plan.id;
                  const isCreating = isSelected && creatingInvoice;
                  const isDone = checkoutUrl && isSelected;

                  return (
                    <motion.div
                      key={plan.id}
                      layout
                      className={cn(
                        "relative flex cursor-pointer flex-col rounded-xl border-2 p-5 transition-all",
                        isDone
                          ? "border-app-success bg-app-success-muted/20"
                          : isSelected
                            ? "border-app-primary bg-app-primary/5 shadow-md"
                            : "border-app-border bg-app-card-hover hover:border-app-primary/50 hover:shadow-sm",
                      )}
                      onClick={() => !creatingInvoice && !checkoutUrl && handleUpgrade(plan.id)}
                    >
                      {/* Plan badge */}
                      <div className="mb-3">
                        <div className="flex items-center gap-2">
                          <Star className={cn(
                            "h-4 w-4",
                            plan.id === "pro" ? "text-app-primary" : "text-app-warning",
                          )} />
                          <span className="text-base font-bold text-app-text">{plan.name}</span>
                        </div>
                        <p className="mt-1 text-xs text-app-text-muted">{plan.description}</p>
                      </div>

                      {/* Price */}
                      <div className="mb-4">
                        <span className="text-2xl font-bold text-app-text">
                          ${plan.price_usdt}
                        </span>
                        <span className="ml-1 text-sm text-app-text-muted">
                          /{plan.billing_label}
                        </span>
                      </div>

                      {/* Features */}
                      <ul className="mb-5 flex-1 space-y-2">
                        {plan.features.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-app-text-muted">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-app-success" />
                            {f}
                          </li>
                        ))}
                      </ul>

                      {/* Actions */}
                      {isDone ? (
                        <div className="flex items-center gap-2 rounded-lg bg-app-success-muted px-3 py-2 text-sm font-medium text-app-success">
                          <CheckCircle2 className="h-4 w-4" />
                          결제 진행 중
                        </div>
                      ) : (
                        <Button
                          variant={isSelected ? "primary" : "secondary"}
                          loading={isCreating}
                          disabled={creatingInvoice || !!checkoutUrl}
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpgrade(plan.id);
                          }}
                        >
                          {isCreating ? (
                            "결제 URL 생성 중..."
                          ) : (
                            <>
                              {plan.name}로 업그레이드
                              <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                            </>
                          )}
                        </Button>
                      )}

                      {/* NOWPayments badge */}
                      {checkoutUrl && isSelected && (
                        <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-app-text-subtle">
                          <ExternalLink className="h-3 w-3" />
                          새 탭에서 결제 창이 열렸습니다
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* ── Footer ──────────────────────────────────────────── */}
            {!loading && (
              <p className="mt-5 text-center text-[11px] text-app-text-subtle">
                결제는 NOWPayments를 통해 안전하게 처리됩니다 · USDT, BTC, ETH 등 지원
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}