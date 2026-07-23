"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Star,
  CheckCircle2,
  Sparkles,
  Rocket,
  Users,
  Zap,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  CalendarDays,
  CreditCard,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { PLAN_LABEL } from "@/lib/constants/plans";
import { useToast } from "@/components/ui/Toast";
import {
  fetchStarProducts,
  createStarInvoice,
  type StarProduct,
} from "@/lib/stars-payment-api";
import { fetchAuthMe } from "@/lib/api";

interface ApiError {
  detail?: string;
  message?: string;
}

// ─── Product Card ────────────────────────────────────────────────────

function ProductCard({
  product,
  onPurchase,
  loading,
}: {
  product: StarProduct;
  onPurchase: (id: string) => void;
  loading: boolean;
}) {
  const isSubscription = product.plan != null;
  const isPopular = product.id === "pro_monthly" || product.id === "pro_yearly";
  const starsDisplay = product.star_amount.toLocaleString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative flex flex-col rounded-2xl border p-6 transition-all duration-200",
        isPopular
          ? "border-app-primary/40 bg-app-primary/[0.04] shadow-md shadow-app-primary/5"
          : "border-app-border bg-app-card hover:border-app-primary/20"
      )}
    >
      {isPopular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-app-primary px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">
          추천
        </span>
      )}

      <div className="mb-4 flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            isSubscription
              ? "bg-indigo-500/10 text-indigo-500"
              : "bg-amber-500/10 text-amber-500"
          )}
        >
          {isSubscription ? <Rocket className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
        </div>
        <div>
          <h3 className="text-base font-semibold text-app-text">
            {product.title}
          </h3>
          {product.label && (
            <span className="text-[12px] text-app-text-muted">
              {product.label}
            </span>
          )}
        </div>
      </div>

      <div className="mb-4">
        <span className="text-3xl font-bold text-app-text">{starsDisplay}</span>
        <span className="ml-1 text-sm text-app-text-muted">Stars</span>
      </div>

      <ul className="mb-6 flex-1 space-y-2">
        {product.description.split("\\n").map((line, i) => (
          <li key={`desc-${i}`} className="flex items-start gap-2 text-[13px] text-app-text-secondary">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
            {line.replace("• ", "")}
          </li>
        ))}
      </ul>

      {/* AI Boost badge */}
      {product.ai_calls && (
        <div className="mb-4 rounded-lg bg-purple-500/10 px-3 py-2 text-[12px] text-purple-500">
          🤖 AI 호출 {product.ai_calls.toLocaleString()}회
        </div>
      )}

      <button
        type="button"
        onClick={() => onPurchase(product.id)}
        disabled={loading}
        className={cn(
          "focus-ring flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-200",
          isSubscription
            ? "bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 active:scale-[0.98]"
            : "border border-app-border bg-app-bg text-app-text hover:bg-app-hover active:scale-[0.98]",
          loading && "pointer-events-none opacity-60"
        )}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Star className="h-4 w-4" />
        )}
        {loading ? "처리 중..." : `${starsDisplay} Stars로 구매`}
      </button>
    </motion.div>
  );
}

// ─── Main Stars Tab ──────────────────────────────────────────────────

export default function StarsTab() {
  const [products, setProducts] = useState<StarProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [telegramChatId, setTelegramChatId] = useState("");
  const [showChatInput, setShowChatInput] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    plan: string | null;
    status: string | null;
    trial_expires_at: string | null;
    stars_balance?: number;
  } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchStarProducts()
      .then(setProducts)
      .catch((err) => {
        console.error("[StarsTab] Failed to load products:", err);
        toast("error", "상품 목록을 불러오지 못했습니다.");
      })
      .finally(() => setLoading(false));

    // Fetch subscription status from auth/me
    fetchAuthMe()
      .then((me) => {
        setSubscriptionStatus({
          plan: me.plan,
          status: me.subscription_status,
          trial_expires_at: me.trial_expires_at,
          stars_balance: me.stars_balance,
        });
      })
      .catch(() => { toast("error", "구독 정보 로드 실패"); })
      .finally(() => setAuthLoading(false));
  }, [toast]);

  const handlePurchase = useCallback(
    async (productId: string) => {
      setPurchasing(productId);
      try {
        const body: Record<string, string> = { product_id: productId };
        if (telegramChatId.trim()) {
          body.telegram_chat_id = telegramChatId.trim();
        }

        const result = await createStarInvoice(productId, telegramChatId.trim() || undefined);

        if (result.ok) {
          toast(
            "success",
            `✨ ${result.star_amount.toLocaleString()} Stars 인보이스가 Telegram으로 전송되었습니다!`
          );
          setShowChatInput(false);
        }
      } catch (err: unknown) {
        const apiErr = err as ApiError;
        const detail =
          apiErr?.detail ||
          (err instanceof Error ? err.message : "알 수 없는 오류");
        if (
          detail.includes("Telegram chat ID not found") ||
          detail.includes("chat ID")
        ) {
          setShowChatInput(true);
          toast(
            "error",
            "Telegram Chat ID가 필요합니다. 아래 입력란에 입력해주세요."
          );
        } else {
          toast("error", `결제 생성 실패: ${detail}`);
        }
      } finally {
        setPurchasing(null);
      }
    },
    [telegramChatId, toast]
  );

  // ── 구독 상태 새로고침 ───────────────────────────────────────────────

  const refreshSubscription = useCallback(async () => {
    setAuthLoading(true);
    try {
      const me = await fetchAuthMe();
      setSubscriptionStatus({
        plan: me.plan,
        status: me.subscription_status,
        trial_expires_at: me.trial_expires_at,
        stars_balance: me.stars_balance,
      });
    } catch { toast("error", "구독 상태 새로고침 실패"); }
    setAuthLoading(false);
  }, []);

  // ── Subscription Status Panel ────────────────────────────────────────

  const EXTRA_PLAN_LABELS: Record<string, string> = {
    ...PLAN_LABEL,
    premium: "Premium",
    enterprise: "Enterprise",
  };

  function formatExpiry(dateStr: string | null): string {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  }

  function renderSubscriptionPanel() {
    if (authLoading) {
      return (
        <div className="rounded-2xl border border-app-border bg-app-card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-app-primary" />
              <span className="text-sm text-app-text-muted">구독 정보 로딩 중...</span>
            </div>
            <button onClick={refreshSubscription} className="p-1 rounded-lg hover:bg-app-card-hover text-app-text-muted">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      );
    }

    if (!subscriptionStatus) return null;

    const { plan, status, trial_expires_at, stars_balance } = subscriptionStatus;
    const isActive = status === "active" || status === "trial";
    const isTrial = status === "trial" || (status === "active" && !!trial_expires_at);
    const planLabel = EXTRA_PLAN_LABELS[plan?.toLowerCase() ?? ""] || plan || "Free";

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        key={JSON.stringify(subscriptionStatus)}
        className={`rounded-2xl border p-5 ${
          isActive
            ? "border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent"
            : "border-app-border bg-app-card"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-app-bg text-app-text-muted"
              }`}
            >
              {isActive ? <ShieldCheck className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-app-text">내 구독</h3>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    isActive
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-amber-500/10 text-amber-600"
                  }`}
                >
                  {isActive ? (isTrial ? "체험 중" : "활성") : "비활성"}
                </span>
              </div>
              <p className="text-xs text-app-text-muted mt-0.5">
                {planLabel}
                {stars_balance != null && ` · ⭐ ${stars_balance.toLocaleString()} Stars`}
              </p>
            </div>
          </div>
          <button
            onClick={refreshSubscription}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-card-hover transition-colors"
            title="구독 상태 새로고침"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-app-bg p-3">
            <p className="text-[10px] text-app-text-muted font-medium uppercase tracking-wide">플랜</p>
            <p className="mt-1 text-sm font-bold text-app-text">{planLabel}</p>
          </div>
          <div className="rounded-xl bg-app-bg p-3">
            <p className="text-[10px] text-app-text-muted font-medium uppercase tracking-wide">상태</p>
            <p className={`mt-1 text-sm font-bold ${isActive ? "text-emerald-500" : "text-amber-500"}`}>
              {isActive ? "✅ 활성" : "❌ 비활성"}
            </p>
          </div>
          <div className="rounded-xl bg-app-bg p-3">
            <p className="text-[10px] text-app-text-muted font-medium uppercase tracking-wide">체험 종료</p>
            <p className="mt-1 text-sm font-bold text-app-text">
              {/* 비활성 사용자에게는 체험 종료일 숨김 */}
              {isActive ? formatExpiry(trial_expires_at) : "-"}
            </p>
          </div>
          <div className="rounded-xl bg-app-bg p-3">
            <p className="text-[10px] text-app-text-muted font-medium uppercase tracking-wide">Stars 잔액</p>
            <p className="mt-1 text-sm font-bold text-amber-500">
              {stars_balance != null ? `${stars_balance.toLocaleString()} ⭐` : "-"}
            </p>
          </div>
        </div>

        {!isActive && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-600">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            현재 활성화된 구독이 없습니다. 아래에서 상품을 선택해 결제해주세요.
          </div>
        )}
      </motion.div>
    );
  }

  // ── Loading ──
  if (loading && products.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-app-primary" />
          <p className="text-sm text-app-text-muted">상품 목록 로딩 중...</p>
        </div>
      </div>
    );
  }

  // ── Empty ──
  if (products.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="max-w-md text-center">
          <Star className="mx-auto mb-4 h-12 w-12 text-app-text-subtle" />
          <h2 className="mb-2 text-lg font-semibold text-app-text">
            현재 구매 가능한 상품이 없습니다
          </h2>
          <p className="text-sm text-app-text-muted">
            잠시 후 다시 시도해주세요.
          </p>
        </div>
      </div>
    );
  }

  // ── Main Content ──
  const subscriptionProducts = products.filter((p) => p.plan);
  const boostProducts = products.filter((p) => p.ai_calls);

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col gap-8 overflow-y-auto p-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
            <Star className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-app-text">
              Telegram Stars 결제
            </h1>
            <p className="text-sm text-app-text-muted">
              Telegram Stars로 TeleMon 프리미엄을 결제하세요.
              Telegram 앱 내에서 1탭으로 결제됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* Subscription Status */}
      {renderSubscriptionPanel()}

      {/* How It Works */}
      <div className="rounded-2xl border border-app-border bg-app-card p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-app-text">
          <Sparkles className="h-4 w-4 text-app-primary" />
          결제 방법
        </h3>
        <ol className="space-y-2 text-[13px] text-app-text-secondary">
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-app-primary/10 text-[11px] font-bold text-app-primary">
              1
            </span>
            원하는 상품의 &quot;구매&quot; 버튼을 클릭하세요
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-app-primary/10 text-[11px] font-bold text-app-primary">
              2
            </span>
            Telegram 앱에서 결제 UI가 자동으로 열립니다
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-app-primary/10 text-[11px] font-bold text-app-primary">
              3
            </span>
            Stars로 결제를 완료하면 즉시 플랜이 업그레이드됩니다
          </li>
        </ol>
      </div>

      {/* Telegram Chat ID Input */}
      {showChatInput && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5"
        >
          <p className="mb-3 text-sm font-medium text-app-text">
            🤖 Telegram Chat ID를 입력해주세요
          </p>
          <p className="mb-3 text-[12px] text-app-text-muted">
            @userinfobot 에게 메시지를 보내면 chat ID를 확인할 수 있습니다.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              placeholder="예: 123456789"
              className="focus-ring flex-1 rounded-lg border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text placeholder:text-app-text-subtle"
            />
            <button
              type="button"
              onClick={() => setShowChatInput(false)}
              className="rounded-lg px-3 py-2 text-sm text-app-text-muted hover:text-app-text"
            >
              닫기
            </button>
          </div>
        </motion.div>
      )}

      {/* Subscription Products */}
      {subscriptionProducts.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-app-text">
            <Rocket className="h-4 w-4 text-indigo-500" />
            구독 플랜
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subscriptionProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onPurchase={handlePurchase}
                loading={purchasing === product.id}
              />
            ))}
          </div>
        </section>
      )}

      {/* AI Boost Products */}
      {boostProducts.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-app-text">
            <Zap className="h-4 w-4 text-amber-500" />
            AI 추가 호출
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {boostProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onPurchase={handlePurchase}
                loading={purchasing === product.id}
              />
            ))}
          </div>
        </section>
      )}

      {/* FAQ / Info */}
      <div className="rounded-2xl border border-app-border bg-app-card p-5">
        <h3 className="mb-2 text-sm font-semibold text-app-text">
          ❓ 자주 묻는 질문
        </h3>
        <div className="space-y-2 text-[13px] text-app-text-secondary">
          <p>
            <strong>Q:</strong> Stars는 어떻게 충전하나요?
          </p>
          <p>
            <strong>A:</strong> Telegram 앱 설정 &gt; Telegram Stars에서
            구매할 수 있습니다. Apple/Google 결제를 지원합니다.
          </p>
          <p className="mt-2">
            <strong>Q:</strong> 환불이 가능한가요?
          </p>
          <p>
            <strong>A:</strong> Telegram Stars 환불 정책을 따릅니다.
            구매 후 21일 이내에 Telegram 지원팀에 문의해주세요.
          </p>
        </div>
      </div>
    </div>
  );
}
