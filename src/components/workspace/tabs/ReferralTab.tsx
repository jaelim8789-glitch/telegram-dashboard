"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy, Share2, TrendingUp, Users, Wallet, CheckCircle2, AlertCircle,
  UserPlus, CreditCard, Download, QrCode, RefreshCw, RotateCcw,
  Trophy, Crown, Target, ArrowRight, ShieldCheck, DollarSign,
  Building2, Gift, ExternalLink, Search, X, Star,
} from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useToast } from "@/components/ui/Toast";
import { InlineError } from "@/components/ui/InlineError";
import { cn } from "@/lib/cn";
import * as api from "@/lib/api_referral";

const PLAN_LABEL: Record<string, string> = {
  free: "무료",
  pro: "Pro",
  team: "Team",
};

const PLAN_COLOR: Record<string, string> = {
  free: "text-app-text-muted",
  pro: "text-blue-500",
  team: "text-purple-500",
};

const PLAN_BG: Record<string, string> = {
  free: "bg-app-text-muted/10",
  pro: "bg-blue-500/10",
  team: "bg-purple-500/10",
};

const TIER_META: Record<string, { label: string; icon: string; color: string }> = {
  기본: { label: "기본", icon: "🌱", color: "text-app-text-muted" },
  Pro: { label: "Pro", icon: "⭐", color: "text-blue-500" },
  VIP: { label: "VIP", icon: "👑", color: "text-amber-500" },
};

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("ko-KR").format(cents) + "원";
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("ko-KR", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function ReferredUserRow({ user }: { user: api.ReferralReferredUser }) {
  const navigateToFeature = useDashboardStore((s) => s.navigateToFeature);
  return (
    <div className="flex items-center justify-between rounded-xl border border-app-border bg-app-card px-3 py-2.5 transition-all hover:border-app-primary/20">
      <div className="flex min-w-0 items-center gap-3">
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold", user.has_paid ? "bg-app-success/20 text-app-success" : "bg-app-card-hover text-app-text-muted")}>
          {user.phone.slice(-4)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-app-text">{user.phone}</p>
          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-app-text-muted">
            <span>{formatDate(user.joined_at)}</span>
            <span className="h-1 w-1 rounded-full bg-app-border" />
            <span className={cn("font-medium", PLAN_COLOR[user.plan] || "")}>{PLAN_LABEL[user.plan] || user.plan}</span>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {user.has_paid && <Badge tone="success">결제</Badge>}
        {!user.has_paid && user.plan !== "free" && <Badge tone="warning">구독중</Badge>}
        {user.plan === "free" && <Badge tone="default">무료</Badge>}
      </div>
    </div>
  );
}

function CommissionRow({ commission }: { commission: api.CommissionItem }) {
  const statusIcon = commission.status === "paid"
    ? <CheckCircle2 className="h-4 w-4 text-app-success" />
    : commission.status === "cancelled"
    ? <X className="h-4 w-4 text-app-danger" />
    : <AlertCircle className="h-4 w-4 text-app-warning" />;

  const statusBg = commission.status === "paid"
    ? "bg-app-success/10"
    : commission.status === "cancelled"
    ? "bg-app-danger/10"
    : "bg-app-warning/10";

  const statusLabel = commission.status === "paid"
    ? "지급 완료"
    : commission.status === "cancelled"
    ? "취소됨"
    : "대기 중";

  const statusTone = commission.status === "paid"
    ? "success" as const
    : commission.status === "cancelled"
    ? "danger" as const
    : "warning" as const;

  return (
    <div className="flex items-center justify-between rounded-xl border border-app-border bg-app-card px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", statusBg)}>
          {statusIcon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-app-text">
            {formatMoney(commission.commission_amount)}
            <span className="ml-1.5 text-[10px] text-app-text-muted">
              (기준 {formatMoney(commission.amount)} × {Math.round(commission.commission_rate * 100)}%)
            </span>
          </p>
          <p className="truncate text-[10px] text-app-text-muted">
            {commission.referred_user_phone} · {formatDate(commission.created_at)}
            {commission.source_type !== "payment" && ` · ${commission.source_type}`}
          </p>
        </div>
      </div>
      <Badge tone={statusTone}>{statusLabel}</Badge>
    </div>
  );
}

function PayoutRow({ payout }: { payout: api.PayoutRecord }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-app-border bg-app-card px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", payout.status === "completed" ? "bg-app-success/10" : payout.status === "rejected" ? "bg-app-danger/10" : "bg-app-warning/10")}>
          {payout.status === "completed"
            ? <CheckCircle2 className="h-4 w-4 text-app-success" />
            : payout.status === "rejected"
            ? <X className="h-4 w-4 text-app-danger" />
            : <AlertCircle className="h-4 w-4 text-app-warning" />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-app-text">{formatMoney(payout.amount)}</p>
          <p className="text-[10px] text-app-text-muted">{formatDateTime(payout.created_at)}</p>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <Badge tone={payout.status === "completed" ? "success" : payout.status === "rejected" ? "danger" : "warning"}>
          {payout.status === "completed" ? "지급 완료" : payout.status === "rejected" ? "반려" : "검토 중"}
        </Badge>
        {payout.paid_at && <p className="mt-0.5 text-[9px] text-app-text-muted">{formatDate(payout.paid_at)}</p>}
      </div>
    </div>
  );
}

function LeaderboardRow({ entry }: { entry: api.LeaderboardEntry }) {
  const rankColors = ["text-amber-500", "text-slate-400", "text-amber-700"];
  const rankIcons = ["🥇", "🥈", "🥉"];
  return (
    <div className="flex items-center gap-3 rounded-xl border border-app-border bg-app-card px-3 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center">
        {entry.rank <= 3
          ? <span className="text-lg">{rankIcons[entry.rank - 1]}</span>
          : <span className="text-xs font-bold text-app-text-muted">{entry.rank}</span>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-app-text">{entry.phone}</p>
        <p className="text-[10px] text-app-text-muted">
          추천 {entry.referral_count}명 · {formatMoney(entry.total_commission_earned)}
        </p>
      </div>
      <Badge tone="info">{entry.tier}</Badge>
    </div>
  );
}

export function ReferralTab() {
  const { toast } = useToast();
  const navigateToFeature = useDashboardStore((s) => s.navigateToFeature);

  // ── State ──
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isDistributor, setIsDistributor] = useState(false);
  const [myCode, setMyCode] = useState<api.ReferralCodeInfo | null>(null);
  const [dashboard, setDashboard] = useState<api.ReferralDashboardResponse | null>(null);
  const [commissions, setCommissions] = useState<api.CommissionItem[]>([]);
  const [payouts, setPayouts] = useState<api.PayoutRecord[]>([]);
  const [leaderboard, setLeaderboard] = useState<api.LeaderboardEntry[]>([]);
  const [minPayout, setMinPayout] = useState(100);
  const [walletAddress, setWalletAddress] = useState("");
  const [savingWallet, setSavingWallet] = useState(false);

  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  // ── Data loading ──
  const loadAll = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);

      const status = await api.checkDistributorStatus();
      setIsDistributor(status.isDistributor);

      if (status.isDistributor) {
        const [codeRes, dashRes, commRes, payoutRes, lbRes, minRes] = await Promise.all([
          api.getMyReferralCode(),
          api.getReferralDashboard(),
          api.getMyCommissions(),
          api.getPayoutHistory(),
          api.getLeaderboard(),
          fetch("/api/referral/min-payout").then(r => r.json()),
        ]);
        setMyCode(codeRes);
        setDashboard(dashRes);
        setCommissions(commRes.items);
        setPayouts(payoutRes.items);
        setLeaderboard(lbRes);
        setMinPayout(minRes.min_payout ?? 100);
      } else {
        try {
          const codeRes = await api.getMyReferralCode();
          setMyCode(codeRes);
        } catch { }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "정보를 불러오는데 실패했습니다.";
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAll(true);
  };

  // ── Actions ──
  const handleRegisterAsDistributor = async () => {
    if (registering) return;
    try {
      setRegistering(true);
      setError(null);
      const result = await api.registerAsDistributor();
      if (result.success) {
        setIsDistributor(true);
        toast("success", "총판 등록 완료", { description: result.message });
        await loadAll(true);
      } else {
        toast("error", "총판 등록 실패", { description: result.message });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "총판 등록에 실패했습니다.";
      setError(msg);
      toast("error", "총판 등록 실패", { description: msg });
    } finally {
      setRegistering(false);
    }
  };

  const copyToClipboard = (text: string, label = "복사 완료") => {
    navigator.clipboard.writeText(text);
    toast("success", label);
  };

  const handleRequestPayout = async () => {
    if (requestingPayout) return;
    try {
      setRequestingPayout(true);
      const result = await api.requestPayout();
      if (result.success) {
        toast("success", "지급 요청 완료", { description: result.message });
        await loadAll(true);
      } else {
        toast("error", "지급 요청 실패", { description: result.message });
      }
    } catch (err: unknown) {
      toast("error", "지급 요청 실패", { description: err instanceof Error ? err.message : "오류가 발생했습니다." });
    } finally {
      setRequestingPayout(false);
    }
  };

  const handleSaveWallet = async () => {
    if (!walletAddress.trim() || savingWallet) return;
    try {
      setSavingWallet(true);
      await api.setWalletAddress(walletAddress.trim());
      toast("success", "지갑 주소가 저장되었습니다.");
    } catch {
      toast("error", "지갑 주소 저장에 실패했습니다.");
    } finally {
      setSavingWallet(false);
    }
  };

  const handleShowQr = async () => {
    try {
      const res = await api.getMyReferralLink();
      setQrCodeUrl(`/api/referral/my-qr?code=${res.code}`);
      setShowQrModal(true);
    } catch {
      toast("error", "QR 코드를 생성할 수 없습니다.");
    }
  };

  const referralLink = myCode
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/signup?ref=${myCode.code}`
    : "";

  const pendingTotal = dashboard?.pending_commission_total ?? 0;
  const paidTotal = dashboard?.paid_commission_total ?? 0;
  const referredUsers = dashboard?.referred_users ?? [];

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-app-primary border-t-transparent" />
          <p className="text-xs text-app-text-muted">정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20">
            <Gift className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-app-text">추천인 시스템</h2>
            <p className="text-[10px] text-app-text-muted">사용자를 추천하고 커미션을 받아보세요</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
        </button>
      </div>

      {/* ── 비-총판: 등록 패널 ── */}
      {!isDistributor && (
        <Panel accent="amber" title="총판 등록" description="추천인 링크로 사용자를 유치하고 커미션을 받아가세요.">
          <div className="space-y-4">
            <div className="rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20">
                  <Building2 className="h-5 w-5 text-amber-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-app-text">총판이 되어 수익을 창출하세요!</p>
                  <p className="text-xs text-app-text-muted leading-relaxed">
                    다른 사용자를 추천하여 해당 사용자의 결제 금액에 대한 커미션을 받을 수 있습니다.
                    추천 인원이 많을수록 높은 커미션율이 적용됩니다.
                    지급은 관리자 승인 후 정기적으로 처리됩니다.
                  </p>
                </div>
              </div>
            </div>

            <Button variant="primary" className="w-full" onClick={handleRegisterAsDistributor} disabled={registering}>
              {registering ? (
                <><span className="mr-1.5 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> 등록 중...</>
              ) : (
                <><Building2 className="mr-1.5 h-4 w-4" /> 총판 등록하기</>
              )}
            </Button>

            {error && <InlineError>{error}</InlineError>}

            {/* 기존 추천코드 표시 */}
            {myCode && (
              <div className="rounded-xl border border-app-border bg-app-card p-3">
                <p className="text-[10px] font-medium text-app-text-muted mb-1">내 추천 코드</p>
                <p className="text-lg font-bold tracking-wider text-app-primary">{myCode.code}</p>
              </div>
            )}
          </div>
        </Panel>
      )}

      {/* ── 총판 대시보드 ── */}
      {isDistributor && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-app-border bg-app-card p-3">
              <div className="flex items-center gap-1.5 text-[10px] text-app-text-muted mb-1">
                <Users className="h-3 w-3" /> 추천
              </div>
              <p className="text-lg font-bold text-app-text">{referredUsers.length}명</p>
            </div>
            <div className="rounded-xl border border-app-border bg-app-card p-3">
              <div className="flex items-center gap-1.5 text-[10px] text-app-text-muted mb-1">
                <Wallet className="h-3 w-3" /> 지급 대기
              </div>
              <p className="text-lg font-bold text-app-warning">{formatMoney(pendingTotal)}</p>
            </div>
            <div className="rounded-xl border border-app-border bg-app-card p-3">
              <div className="flex items-center gap-1.5 text-[10px] text-app-text-muted mb-1">
                <CheckCircle2 className="h-3 w-3" /> 지급 완료
              </div>
              <p className="text-lg font-bold text-app-success">{formatMoney(paidTotal)}</p>
            </div>
            <div className="rounded-xl border border-app-border bg-app-card p-3">
              <div className="flex items-center gap-1.5 text-[10px] text-app-text-muted mb-1">
                <DollarSign className="h-3 w-3" /> 정산 기준
              </div>
              <p className="text-lg font-bold text-app-text">{formatMoney(minPayout)}</p>
            </div>
          </div>

          {/* Referral Link */}
          <Panel accent="cyan" title="내 추천 링크" description="이 링크로 가입한 사용자가 자동 추천됩니다.">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 truncate rounded-lg border border-app-border bg-app-surface px-3 py-2 text-xs text-app-text font-mono">
                  {referralLink || (myCode?.code ?? "")}
                </div>
                <Button variant="secondary" size="sm" onClick={() => copyToClipboard(referralLink)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button variant="secondary" size="sm" onClick={handleShowQr}>
                  <QrCode className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="primary" size="sm" className="flex-1" onClick={() => copyToClipboard(referralLink, "링크 복사 완료")}>
                  <Share2 className="mr-1 h-3.5 w-3.5" /> 링크 공유
                </Button>
                {myCode && (
                  <Button variant="secondary" size="sm" onClick={() => copyToClipboard(myCode.code, "코드 복사 완료")}>
                    코드 복사
                  </Button>
                )}
              </div>
            </div>
          </Panel>

          {/* Wallet Address */}
          <Panel title="지갑 주소 (정산 수령)" description="정산 금액을 수령할 USDT 지갑 주소를 입력하세요.">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="USDT TRC-20 지갑 주소"
                className="flex-1 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-xs text-app-text placeholder:text-app-text-muted/50 focus:border-app-primary/50 focus:outline-none"
              />
              <Button variant="secondary" size="sm" onClick={handleSaveWallet} disabled={savingWallet || !walletAddress.trim()}>
                {savingWallet ? "저장 중..." : "저장"}
              </Button>
            </div>
          </Panel>

          {/* 유치 회원 목록 */}
          <Panel accent="indigo" title={`유치 회원 (${referredUsers.length})`} description="내 추천으로 가입한 회원 목록">
            {referredUsers.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-app-text-muted">
                <UserPlus className="mb-2 h-8 w-8 opacity-30" />
                <p className="text-xs">아직 추천한 회원이 없습니다.</p>
                <p className="text-[10px] mt-1">추천 링크를 공유해보세요!</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {referredUsers.map((user) => (
                  <ReferredUserRow key={user.tenant_id} user={user} />
                ))}
              </div>
            )}
          </Panel>

          {/* 커미션 내역 */}
          <Panel
            accent="emerald"
            title={`커미션 내역 (${commissions.length})`}
            description="발생한 커미션 상세 내역"
            action={commissions.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  fetch("/api/referral/commissions/csv").then(r => r.blob()).then(blob => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `commissions-${new Date().toISOString().slice(0, 10)}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }).catch(() => toast("error", "CSV 내보내기에 실패했습니다."));
                }}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors"
              >
                <Download className="h-3 w-3" /> CSV
              </button>
            )}
          >
            {commissions.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-app-text-muted">
                <Wallet className="mb-2 h-8 w-8 opacity-30" />
                <p className="text-xs">아직 발생한 커미션이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {commissions.map((c) => (
                  <CommissionRow key={c.id} commission={c} />
                ))}
              </div>
            )}
          </Panel>

          {/* 정산 내역 및 지급 요청 */}
          <Panel accent="purple" title="정산 내역" description="지급 요청 및 정산 이력">
            <div className="space-y-4">
              <Button
                variant="primary"
                className="w-full"
                onClick={handleRequestPayout}
                disabled={requestingPayout}
              >
                {requestingPayout ? (
                  <><span className="mr-1.5 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> 처리 중...</>
                ) : (
                  <><DollarSign className="mr-1.5 h-4 w-4" /> 지급 요청 (최소 {formatMoney(minPayout)})</>
                )}
              </Button>

              {payouts.length > 0 && (
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {payouts.map((p) => (
                    <PayoutRow key={p.id} payout={p} />
                  ))}
                </div>
              )}
              {payouts.length === 0 && (
                <p className="text-center text-[10px] text-app-text-muted">정산 내역이 없습니다.</p>
              )}
            </div>
          </Panel>

          {/* 리더보드 */}
          {leaderboard.length > 0 && (
            <Panel
              accent="amber"
              title="총판 리더보드"
              description="커미션 수익 기준 TOP 랭킹"
            >
              <div className="space-y-1.5">
                {leaderboard.slice(0, 10).map((entry) => (
                  <LeaderboardRow key={entry.referrer_id} entry={entry} />
                ))}
              </div>
            </Panel>
          )}
        </>
      )}

      {/* ── QR Modal ── */}
      <AnimatePresence>
        {showQrModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowQrModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-72 rounded-2xl border border-app-border bg-app-card p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-app-text">QR 코드</h3>
                <button
                  type="button"
                  onClick={() => setShowQrModal(false)}
                  className="flex h-6 w-6 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-card-hover transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCodeUrl}
                  alt="Referral QR Code"
                  className="h-48 w-48 rounded-xl border border-app-border"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
              <p className="mt-3 text-center text-[10px] text-app-text-muted">
                QR 코드를 스캔하여 가입하면 자동 추천됩니다
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <InlineError>{error}</InlineError>}
    </div>
  );
}
