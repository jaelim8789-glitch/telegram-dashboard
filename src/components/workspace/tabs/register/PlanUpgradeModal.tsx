"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, X, Loader2, Crown, Copy, Check, Clock,
  Wallet, ExternalLink, Star, ArrowLeft, TriangleAlert, PartyPopper,
} from "lucide-react";

import * as api from "@/lib/api";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";

/* ────────────────────────────────────────────────────────────────── */

type Step = "select" | "payment" | "completed" | "error";

interface PlanInfo {
  id: string;
  name: string;
  description: string;
  features: string[];
  price_usdt: number;
  billing_interval: string;
  billing_label: string;
}

interface InvoiceData {
  payment_id: string;
  payment_status: string;
  pay_address: string;
  pay_amount: number;
  pay_currency: string;
  price_amount: number;
  price_currency: string;
  order_id: string;
  expiration_estimate_date: string;
  invoice_url: string;
}

interface PlanUpgradeModalProps {
  open: boolean;
  onClose: () => void;
  currentPlan?: string;
  currentAccountCount?: number;
}

/* ────────────────────────────────────────────────────────────────── */

const POLL_INTERVAL = 5000; // 5초
const PAYMENT_TIMEOUT_MINUTES = 60;

function formatAddress(addr: string): string {
  if (addr.length <= 16) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

function formatCryptoAmount(amount: number, currency: string): string {
  const decimals = currency.toUpperCase() === "USDT" ? 2 : 6;
  return `${amount.toFixed(decimals)} ${currency.toUpperCase()}`;
}

function getExplorerUrl(currency: string, address: string): string {
  const base = {
    BTC: "https://blockchair.com/bitcoin/address",
    ETH: "https://etherscan.io/address",
    USDT: "https://etherscan.io/address", // USDT(ERC-20)
    BNB: "https://bscscan.com/address",
    TRX: "https://tronscan.org/#/address",
    SOL: "https://solscan.io/account",
    LTC: "https://blockchair.com/litecoin/address",
    DOGE: "https://blockchair.com/dogecoin/address",
    MATIC: "https://polygonscan.com/address",
  }[currency.toUpperCase()];
  return base ? `${base}/${address}` : "#";
}

/* ────────────────────────────────────────────────────────────────── */

export function PlanUpgradeModal({
  open,
  onClose,
  currentPlan = "free",
  currentAccountCount = 0,
}: PlanUpgradeModalProps) {
  const [step, setStep] = useState<Step>("select");
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Payment state
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(PAYMENT_TIMEOUT_MINUTES * 60);
  const [paymentStatus, setPaymentStatus] = useState<string>("created");
  const [statusMessage, setStatusMessage] = useState("결제 대기 중");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeLeftRef = useRef(PAYMENT_TIMEOUT_MINUTES * 60);
  const qrUrl = invoice
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(invoice.pay_address)}`
    : "";

  /* ── Reset state when modal opens ────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    setStep("select");
    setSelectedPlanId(null);
    setInvoice(null);
    setCopied(false);
    setPaymentStatus("created");
    setStatusMessage("결제 대기 중");
    setError(null);
    setLoading(true);
    setTimeLeft(PAYMENT_TIMEOUT_MINUTES * 60);

    fetch("/api/billing/plans")
      .then((r) => r.json())
      .then((data: { plans: PlanInfo[] }) =>
        setPlans(data.plans.filter((p) => p.id !== "free")),
      )
      .catch(() => setError("요금제 정보를 불러오지 못했습니다."))
      .finally(() => setLoading(false));

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [open]);

  /* ── Timer countdown ─────────────────────────────────────────── */
  useEffect(() => {
    if (step !== "payment") return;
    timeLeftRef.current = PAYMENT_TIMEOUT_MINUTES * 60;
    setTimeLeft(PAYMENT_TIMEOUT_MINUTES * 60);
    timerRef.current = setInterval(() => {
      timeLeftRef.current -= 1;
      setTimeLeft(timeLeftRef.current);
      if (timeLeftRef.current <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setStep("error");
        setStatusMessage("결제 시간이 만료되었습니다.");
      }
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step]);

  /* ── Payment status polling ──────────────────────────────────── */
  useEffect(() => {
    if (step !== "payment" || !invoice) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/payments/nowpayments/status/${invoice.payment_id}`,
          { headers: api.authHeaders() },
        );
        if (!res.ok) return;
        const data = await res.json();
        setPaymentStatus(data.status);

        if (data.status === "finished" || data.status === "confirmed") {
          setStatusMessage("결제 확인됨! 업그레이드 적용 중...");
          if (pollRef.current) clearInterval(pollRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
          // Short delay for success animation
          setTimeout(() => setStep("completed"), 1500);
        } else if (data.status === "partially_paid") {
          setStatusMessage("일부 금액이 입금되었습니다. 나머지를 보내주세요.");
        } else if (data.status === "expired") {
          setStatusMessage("결제 시간이 만료되었습니다.");
          if (pollRef.current) clearInterval(pollRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
          setStep("error");
        } else if (data.status === "failed") {
          setStatusMessage("결제에 실패했습니다.");
          if (pollRef.current) clearInterval(pollRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
          setStep("error");
        } else {
          setStatusMessage(
            data.status === "created"
              ? "입금 대기 중..."
              : "입금 확인 중...",
          );
        }
      } catch {
        // Network error — retry on next interval
      }
    }, POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [step, invoice]);

  /* ── Create invoice ──────────────────────────────────────────── */
  const handleCreateInvoice = useCallback(
    async (planId: string) => {
      setSelectedPlanId(planId);
      setCreating(true);
      setError(null);

      try {
        const plan = plans.find((p) => p.id === planId);
        if (!plan) throw new Error("Plan not found");

        const res = await fetch(
          "/api/payments/nowpayments/create-invoice",
          {
            method: "POST",
            headers: api.authHeaders(),
            body: JSON.stringify({
              plan: planId,
              amount: plan.price_usdt,
              currency: "USDT",
              description: `TeleMon ${plan.name} — ${plan.billing_label}간`,
            }),
          },
        );

        if (!res.ok) {
          const contentType = res.headers.get("content-type");
          let errMsg = "결제 인보이스 생성에 실패했습니다.";
          if (res.status === 401) errMsg = "로그인이 필요합니다. 로그인 후 다시 시도해주세요.";
          else if (res.status === 429) errMsg = "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";
          else try { const err = await res.json(); errMsg = err.detail || errMsg; } catch {}
          throw new Error(errMsg);
        }

        const data = await res.json();
        setInvoice({
          payment_id: data.payment_id,
          payment_status: data.payment_status || "created",
          pay_address: data.pay_address || "",
          pay_amount: data.pay_amount || plan.price_usdt,
          pay_currency: data.pay_currency || "USDT",
          price_amount: data.price_amount || plan.price_usdt,
          price_currency: data.price_currency || "USD",
          order_id: data.order_id || "",
          expiration_estimate_date: data.expiration_estimate_date || "",
          invoice_url: data.invoice_url || "",
        });

        setStep("payment");
        setTimeLeft(PAYMENT_TIMEOUT_MINUTES * 60);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "알 수 없는 오류",
        );
      } finally {
        setCreating(false);
      }
    },
    [plans],
  );

  /* ── Copy address ────────────────────────────────────────────── */
  const handleCopy = useCallback(async () => {
    if (!invoice) return;
    try {
      await navigator.clipboard.writeText(invoice.pay_address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = invoice.pay_address;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [invoice]);

  /* ── Format time ─────────────────────────────────────────────── */
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const progress = 1 - timeLeft / (PAYMENT_TIMEOUT_MINUTES * 60);
  const isExpired = timeLeft <= 0;

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 24 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-app-border bg-app-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Close ──────────────────────────────────────────── */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-app-text-muted hover:bg-app-border hover:text-app-text transition-colors"
              aria-label="닫기"
            >
              <X className="h-5 w-5" />
            </button>

            {/* ── STEP: Plan Selection ────────────────────────────── */}
            {step === "select" && (
              <>
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-app-primary/10">
                    <Crown className="h-5 w-5 text-app-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-app-text">
                      요금제 업그레이드
                    </h2>
                    <p className="text-sm text-app-text-muted">
                      현재 계정 {currentAccountCount}개 사용 중 · 한도 초과
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="mb-4 rounded-xl border border-app-danger/20 bg-app-danger-muted px-4 py-3 text-sm text-app-danger">
                    {error}
                  </div>
                )}

                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-app-primary" />
                    <span className="ml-3 text-sm text-app-text-muted">
                      요금제 정보 불러오는 중...
                    </span>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {plans.map((plan) => (
                      <motion.div
                        key={plan.id}
                        layout
                        className="relative flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition-all hover:shadow-sm"
                        onClick={() => handleCreateInvoice(plan.id)}
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-app-primary/10">
                          <Star
                            className={cn(
                              "h-5 w-5",
                              plan.id === "pro"
                                ? "text-app-primary"
                                : "text-app-warning",
                            )}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-app-text">
                              {plan.name}
                            </span>
                            <span className="text-lg font-bold text-app-primary">
                              ${plan.price_usdt}
                            </span>
                            <span className="text-xs text-app-text-muted">
                              /{plan.billing_label}
                            </span>
                          </div>
                          {plan.id === "pro" && (
                            <p className="text-xs text-app-text-muted mt-0.5">
                              10개 계정 · 50,000회/월 발송 · 자동 예약
                            </p>
                          )}
                          {plan.id === "team" && (
                            <p className="text-xs text-app-text-muted mt-0.5">
                              25개 계정 · 200,000회/월 · 우선 지원
                            </p>
                          )}
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          loading={creating && selectedPlanId === plan.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreateInvoice(plan.id);
                          }}
                        >
                          {creating && selectedPlanId === plan.id
                            ? "생성 중..."
                            : "선택"}
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                )}

                {!loading && (
                  <p className="mt-5 text-center text-[11px] text-app-text-subtle">
                    결제는 NOWPayments를 통해 안전하게 처리됩니다 · USDT, BTC,
                    ETH 등 지원
                  </p>
                )}
              </>
            )}

            {/* ── STEP: Payment ────────────────────────────────────── */}
            {step === "payment" && invoice && (
              <div className="space-y-5">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setStep("select")}
                    className="rounded-lg p-1.5 text-app-text-muted hover:bg-app-border transition-colors"
                    aria-label="뒤로"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <Wallet className="h-5 w-5 text-app-primary" />
                  <h2 className="text-lg font-semibold text-app-text">
                    암호화폐 결제
                  </h2>
                </div>

                {/* Timer & Status */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock
                        className={cn(
                          "h-4 w-4",
                          isExpired
                            ? "text-app-danger"
                            : "text-app-warning",
                        )}
                      />
                      <span
                        className={cn(
                          "font-mono font-bold",
                          isExpired
                            ? "text-app-danger"
                            : timeLeft < 180
                              ? "text-app-warning"
                              : "text-app-text",
                        )}
                      >
                        {isExpired ? "만료됨" : formatTime(timeLeft)}
                      </span>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium text-app-text">
                        {statusMessage}
                      </p>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-app-border">
                    <motion.div
                      className={cn(
                        "h-full rounded-full",
                        isExpired
                          ? "bg-app-danger"
                          : progress > 0.8
                            ? "bg-app-warning"
                            : "bg-app-primary",
                      )}
                      initial={{ width: "0%" }}
                      animate={{ width: `${Math.min(progress * 100, 100)}%` }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                </div>

                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="rounded-2xl border-2 border-app-border bg-white p-3 shadow-sm">
                    {qrUrl && (
                      <img
                        src={qrUrl}
                        alt="결제 주소 QR 코드"
                        width={250}
                        height={250}
                        className="rounded-xl"
                      />
                    )}
                  </div>
                </div>

                {/* Crypto Amount */}
                <div className="rounded-xl border border-app-border bg-app-card-hover p-4 text-center">
                  <p className="text-xs text-app-text-muted mb-1">
                    보내실 금액
                  </p>
                  <p className="text-2xl font-bold text-app-text tracking-tight">
                    {formatCryptoAmount(
                      invoice.pay_amount,
                      invoice.pay_currency,
                    )}
                  </p>
                  <p className="text-xs text-app-text-muted mt-1">
                    ≈ ${invoice.price_amount.toFixed(2)} USD
                  </p>
                </div>

                {/* Wallet Address */}
                <div>
                  <p className="mb-1.5 text-xs font-medium text-app-text-muted">
                    입금 주소
                  </p>
                  <div className="flex items-center gap-2 rounded-xl border border-app-border bg-app-card-hover px-3 py-2.5">
                    <code className="flex-1 truncate text-xs font-mono text-app-text select-all">
                      {invoice.pay_address}
                    </code>
                    <button
                      onClick={handleCopy}
                      className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors hover:bg-app-border"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-app-success" />
                          <span className="text-app-success">복사됨</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-app-text-muted" />
                          <span className="text-app-text-muted">복사</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] text-app-text-subtle">
                    정확히 이 주소로 위 금액을 보내주세요
                  </p>
                </div>

                {/* Check on explorer */}
                <div className="flex items-center justify-center">
                  <a
                    href={getExplorerUrl(
                      invoice.pay_currency,
                      invoice.pay_address,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-app-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    블록체인 탐색기에서 확인
                  </a>
                </div>

                {/* NOWPayments Alternative */}
                <div className="rounded-xl border border-dashed border-app-border bg-app-card/30 px-4 py-3">
                  <p className="text-xs text-app-text-muted text-center">
                    다른 방법으로 결제하려면{" "}
                    <a
                      href={invoice.invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-app-primary hover:underline"
                    >
                      NOWPayments 페이지
                    </a>
                    에서 신용카드 등으로 결제할 수 있습니다.
                  </p>
                </div>

                {/* Cancel */}
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    if (pollRef.current) clearInterval(pollRef.current);
                    if (timerRef.current) clearInterval(timerRef.current);
                    setStep("select");
                    setInvoice(null);
                  }}
                >
                  결제 취소
                </Button>
              </div>
            )}

            {/* ── STEP: Payment Error ──────────────────────────────── */}
            {step === "error" && (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-app-danger-muted">
                  <TriangleAlert className="h-8 w-8 text-app-danger" />
                </div>
                <h2 className="text-lg font-semibold text-app-text">
                  결제 실패
                </h2>
                <p className="mt-1 text-sm text-app-text-muted">
                  {paymentStatus === "expired"
                    ? "결제 시간이 만료되었습니다."
                    : "결제 처리 중 오류가 발생했습니다."}
                </p>
                <p className="mt-1 text-xs text-app-text-subtle">
                  상태: {paymentStatus}
                </p>
                <div className="mt-6 flex gap-3">
                  <Button variant="secondary" onClick={onClose}>
                    닫기
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      setStep("select");
                      setInvoice(null);
                    }}
                  >
                    다시 시도
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP: Completed ──────────────────────────────────── */}
            {step === "completed" && (
              <div className="flex flex-col items-center py-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.3, 1] }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-app-success-muted"
                >
                  <PartyPopper className="h-10 w-10 text-app-success" />
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-xl font-bold text-app-text"
                >
                  🎉 업그레이드 완료!
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-2 text-sm text-app-text-muted max-w-xs"
                >
                  결제가 확인되어 요금제가 업그레이드되었습니다.
                  이제 더 많은 계정을 등록할 수 있습니다.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="mt-8 flex gap-3"
                >
                  <Button variant="primary" onClick={onClose}>
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    확인
                  </Button>
                </motion.div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}