"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy, Share2, TrendingUp, Users, Wallet, CheckCircle2, AlertCircle,
  UserPlus, Download, QrCode, RefreshCw,
  Trophy, DollarSign,
  Building2, Gift, ExternalLink, X, Star, Zap, ShieldCheck,
  Medal, Award, Target, BarChart3, Layers,
} from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useToast } from "@/components/ui/Toast";
import { InlineError } from "@/components/ui/InlineError";
import { cn } from "@/lib/cn";
import { formatMoney, formatDate, formatDateTime } from "@/lib/format";
import { PLAN_LABEL, PLAN_COLOR } from "@/lib/constants/plans";
import * as api from "@/lib/api_referral";

// ── Sub-components ──

function ReferredUserRow({ user }: { user: api.ReferralReferredUser }) {
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
            {user.level != null && <><span className="h-1 w-1 rounded-full bg-app-border" /> Lv.{user.level}</>}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {user.has_paid && <Badge tone="success">결제</Badge>}
        {!user.has_paid && user.plan !== "free" && <Badge tone="warning">구독중</Badge>}
        {user.plan === "free" && <Badge tone="neutral">무료</Badge>}
      </div>
    </div>
  );
}

function CommissionRow({ commission }: { commission: api.CommissionItem }) {
  const statusIcon = commission.status === "paid" ? <CheckCircle2 className="h-4 w-4 text-app-success" />
    : commission.status === "cancelled" ? <X className="h-4 w-4 text-app-danger" />
    : <AlertCircle className="h-4 w-4 text-app-warning" />;
  const statusBg = commission.status === "paid" ? "bg-app-success/10"
    : commission.status === "cancelled" ? "bg-app-danger/10" : "bg-app-warning/10";
  const statusLabel = commission.status === "paid" ? "지급 완료"
    : commission.status === "cancelled" ? "취소됨" : "대기 중";
  const statusTone = commission.status === "paid" ? "success" as const
    : commission.status === "cancelled" ? "danger" as const : "warning" as const;

  return (
    <div className="flex items-center justify-between rounded-xl border border-app-border bg-app-card px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", statusBg)}>{statusIcon}</div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-app-text">
            {formatMoney(commission.commission_amount)}
            <span className="ml-1.5 text-[10px] text-app-text-muted">
              (기준 {formatMoney(commission.amount)} × {Math.round(commission.commission_rate * 100)}%)
            </span>
            {commission.level === 2 && <Badge tone="info" className="ml-1.5">2차</Badge>}
          </p>
          <p className="truncate text-[10px] text-app-text-muted">
            {commission.referred_user_phone} · {formatDate(commission.created_at)}
            {commission.source_type === "recurring" && " · 반복"}
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
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          payout.status === "completed" ? "bg-app-success/10" : payout.status === "rejected" ? "bg-app-danger/10" : "bg-app-warning/10")}>
          {payout.status === "completed" ? <CheckCircle2 className="h-4 w-4 text-app-success" />
            : payout.status === "rejected" ? <X className="h-4 w-4 text-app-danger" />
            : <AlertCircle className="h-4 w-4 text-app-warning" />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-app-text">
            {formatMoney(payout.amount)}
            {payout.fee > 0 && <span className="ml-1 text-[10px] text-app-text-muted">(수수료 {formatMoney(payout.fee)})</span>}
            {payout.payout_type === "instant" && <Badge tone="warning" className="ml-1.5">즉시</Badge>}
          </p>
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
  const rankIcons = ["🥇", "🥈", "🥉"];
  return (
    <div className="flex items-center gap-3 rounded-xl border border-app-border bg-app-card px-3 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center">
        {entry.rank <= 3 ? <span className="text-lg">{rankIcons[entry.rank - 1]}</span>
          : <span className="text-xs font-bold text-app-text-muted">{entry.rank}</span>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-app-text">
          {entry.phone}
          <span className="ml-1.5 text-[10px] text-app-text-muted">Lv.{entry.level}</span>
        </p>
        <p className="text-[10px] text-app-text-muted">추천 {entry.referral_count}명 · {formatMoney(entry.total_commission_earned)}</p>
      </div>
      <Badge tone="info">{entry.tier}</Badge>
    </div>
  );
}

function BadgeCard({ badge }: { badge: api.BadgeDef }) {
  const earned = !!badge.earned_at;
  return (
    <div className={cn(
      "flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-all",
      earned ? "border-amber-500/30 bg-amber-500/5" : "border-app-border bg-app-card opacity-40",
    )}>
      <span className="text-2xl">{badge.icon}</span>
      <p className="text-[10px] font-semibold text-app-text">{badge.label}</p>
      <p className="text-[8px] text-app-text-muted">{badge.desc}</p>
      {earned && <p className="text-[8px] text-amber-500">{formatDate(badge.earned_at)}</p>}
    </div>
  );
}

function MissionRow({ mission }: { mission: api.WeeklyMission }) {
  const pct = mission.target > 0 ? Math.min(100, Math.round((mission.current / mission.target) * 100)) : 0;
  return (
    <div className={cn(
      "flex items-center gap-3 rounded-xl border px-3 py-2.5",
      mission.completed ? "border-app-success/30 bg-app-success/5" : "border-app-border bg-app-card",
    )}>
      <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
        mission.completed ? "bg-app-success/20" : "bg-app-card-hover",
      )}>
        {mission.completed ? <CheckCircle2 className="h-4 w-4 text-app-success" /> : <Target className="h-4 w-4 text-app-text-muted" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className={cn("text-xs font-medium", mission.completed ? "text-app-success" : "text-app-text")}>{mission.label}</p>
          <span className="text-[9px] text-app-text-muted">{mission.reward}</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-app-border">
          <div className={cn("h-full rounded-full transition-all", mission.completed ? "bg-app-success" : "bg-app-primary")} style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-0.5 text-[9px] text-app-text-muted">{mission.current}/{mission.target}</p>
      </div>
    </div>
  );
}

// ── Main Component ──

export function ReferralTab() {
  const { toast } = useToast();
  const navigateToChat = useDashboardStore((s) => s.navigateToChat);

  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [instaCashing, setInstaCashing] = useState(false);
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
  const [payoutMethod, setPayoutMethod] = useState("wallet");

  const [badges, setBadges] = useState<api.BadgeDef[]>([]);
  const [missions, setMissions] = useState<api.WeeklyMission[]>([]);

  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [showBadges, setShowBadges] = useState(false);

  const loadAll = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);

      const status = await api.checkDistributorStatus();
      setIsDistributor(status.isDistributor);

      if (status.isDistributor) {
        const [codeRes, dashRes, commRes, payoutRes, lbRes, minRes, badgeRes, missionRes] = await Promise.all([
          api.getMyReferralCode(),
          api.getReferralDashboard(),
          api.getMyCommissions(),
          api.getPayoutHistory(),
          api.getLeaderboard(),
          fetch("/api/referral/min-payout").then(r => r.json()),
          api.getBadges(),
          api.getWeeklyMissions(),
        ]);
        setMyCode(codeRes);
        setDashboard(dashRes);
        setCommissions(commRes.items);
        setPayouts(payoutRes.items);
        setLeaderboard(lbRes);
        setMinPayout(minRes.min_payout ?? 100);
        setBadges(badgeRes.all_badges.map(b => ({ ...b, earned_at: badgeRes.badges.find((eb: { badge_key: string; earned_at: string | null }) => eb.badge_key === b.key)?.earned_at ?? null })));
        setMissions(missionRes);
      } else {
        try { const codeRes = await api.getMyReferralCode(); setMyCode(codeRes); } catch { }
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

  const handleRefresh = () => { setRefreshing(true); loadAll(true); };

  const handleRegisterAsDistributor = async () => {
    if (registering) return;
    try {
      setRegistering(true); setError(null);
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
    } finally { setRegistering(false); }
  };

  const copyToClipboard = (text: string, label = "복사 완료") => { navigator.clipboard.writeText(text); toast("success", label); };

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
    } finally { setRequestingPayout(false); }
  };

  const handleInstantCashout = async () => {
    if (instaCashing) return;
    try {
      setInstaCashing(true);
      const result = await api.instantCashout();
      if (result.success) {
        toast("success", "즉시 지급 완료", { description: result.message });
        await loadAll(true);
      } else {
        toast("error", "즉시 지급 실패", { description: result.message });
      }
    } catch (err: unknown) {
      toast("error", "즉시 지급 실패", { description: err instanceof Error ? err.message : "오류가 발생했습니다." });
    } finally { setInstaCashing(false); }
  };

  const handleSaveWallet = async () => {
    if (!walletAddress.trim() || savingWallet) return;
    try {
      setSavingWallet(true);
      await api.setWalletAddress(walletAddress.trim());
      toast("success", "지갑 주소가 저장되었습니다.");
    } catch { toast("error", "지갑 주소 저장에 실패했습니다."); }
    finally { setSavingWallet(false); }
  };

  const handleSetPayoutMethod = async (method: string) => {
    try {
      await api.setPayoutMethod(method, method === "wallet" ? walletAddress : undefined);
      setPayoutMethod(method);
      toast("success", `지급 방식이 변경되었습니다.`);
    } catch { toast("error", "변경에 실패했습니다."); }
  };

  const handleShowQr = async () => {
    try {
      const res = await api.getMyReferralLink();
      setQrCodeUrl(`/api/referral/my-qr?code=${res.code}`);
      setShowQrModal(true);
    } catch { toast("error", "QR 코드를 생성할 수 없습니다."); }
  };

  const referralLink = myCode
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/signup?ref=${myCode.code}` : "";

  const pendingTotal = dashboard?.pending_commission_total ?? 0;
  const paidTotal = dashboard?.paid_commission_total ?? 0;
  const referredUsers = dashboard?.referred_users ?? [];

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
            <p className="text-[10px] text-app-text-muted">최대 70% 커미션 + 2차 보상</p>
          </div>
        </div>
        <button type="button" onClick={handleRefresh} disabled={refreshing}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors">
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
        </button>
      </div>

      {/* ── 비-총판: 등록 패널 ── */}
      {!isDistributor && (
        <Panel accent="amber" title="총판 등록 (최대 70% 커미션)" description="추천인 링크로 사용자를 유치하고 50%~70% 커미션을 받아가세요.">
          <div className="space-y-4">
            <div className="rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20">
                  <Building2 className="h-5 w-5 text-amber-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-app-text">50% 기본 커미션!</p>
                  <p className="text-xs text-app-text-muted leading-relaxed">
                    추천인의 결제 금액의 최대 70%를 커미션으로 받아가세요.
                    추천인이 또 추천하면 2차 커미션 15% 추가 지급!
                    등급이 높을수록 본인 요금제 할인 혜택도 제공됩니다.
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
          {/* Tier / Level Badge */}
          <div className="flex items-center gap-2">
            <Badge tone="info" className="text-[11px]">
              Lv.{dashboard?.distributor_level ?? 1} {dashboard?.tier_label ?? "기본"}
            </Badge>
            <Badge tone="warning" className="text-[11px]">
              커미션 {Math.round((dashboard?.tier_rate ?? 0.5) * 100)}%
            </Badge>
            <button type="button" onClick={() => setShowBadges(!showBadges)}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors">
              <Award className="h-3 w-3" /> 배지 {dashboard?.badges.length ?? 0}
            </button>
          </div>

          {/* Badge Grid */}
          <AnimatePresence>
            {showBadges && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <Panel compact title="업적 배지">
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {badges.map((b) => <BadgeCard key={b.key} badge={b} />)}
                  </div>
                </Panel>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Weekly Missions */}
          {missions.length > 0 && (
            <Panel compact accent="cyan" title="주간 미션" description="이번 주 미션을 완료하고 보너스를 받으세요!">
              <div className="space-y-1.5">
                {missions.map((m) => <MissionRow key={m.key} mission={m} />)}
              </div>
            </Panel>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-app-border bg-app-card p-3">
              <div className="flex items-center gap-1.5 text-[10px] text-app-text-muted mb-1">
                <Users className="h-3 w-3" /> 추천
              </div>
              <p className="text-lg font-bold text-app-text">{referredUsers.length}명</p>
              <p className="text-[9px] text-app-text-muted">주간 +{dashboard?.weekly_referrals ?? 0}</p>
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
                <Button variant="secondary" size="sm" onClick={() => copyToClipboard(referralLink)}><Copy className="h-3.5 w-3.5" /></Button>
                <Button variant="secondary" size="sm" onClick={handleShowQr}><QrCode className="h-3.5 w-3.5" /></Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="primary" size="sm" className="flex-1" onClick={() => copyToClipboard(referralLink, "링크 복사 완료")}>
                  <Share2 className="mr-1 h-3.5 w-3.5" /> 링크 공유
                </Button>
                {myCode && <Button variant="secondary" size="sm" onClick={() => copyToClipboard(myCode.code, "코드 복사 완료")}>코드 복사</Button>}
              </div>
            </div>
          </Panel>

          {/* Payout Method */}
          <Panel title="지급 방식 설정" description="정산 금액을 수령할 방법을 선택하세요.">
            <div className="space-y-3">
              <div className="flex gap-2">
                {[
                  { key: "wallet", label: "USDT 지갑", icon: Wallet },
                  { key: "stars", label: "Telegram Stars", icon: Star },
                  { key: "credit", label: "계정 크레딧", icon: DollarSign },
                ].map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button key={opt.key} type="button" onClick={() => handleSetPayoutMethod(opt.key)}
                      className={cn(
                        "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all",
                        payoutMethod === opt.key ? "border-app-primary bg-app-primary/10 text-app-primary" : "border-app-border text-app-text-muted hover:border-app-primary/30",
                      )}>
                      <Icon className="h-3.5 w-3.5" /> {opt.label}
                    </button>
                  );
                })}
              </div>
              {payoutMethod === "wallet" && (
                <div className="flex items-center gap-2">
                  <input type="text" value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)}
                    placeholder="USDT TRC-20 지갑 주소"
                    className="flex-1 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-xs text-app-text placeholder:text-app-text-muted/50 focus:border-app-primary/50 focus:outline-none" />
                  <Button variant="secondary" size="sm" onClick={handleSaveWallet} disabled={savingWallet || !walletAddress.trim()}>
                    {savingWallet ? "저장 중..." : "저장"}
                  </Button>
                </div>
              )}
              {payoutMethod === "stars" && <p className="text-[10px] text-app-text-muted">Telegram Stars로 즉시 지급됩니다.</p>}
              {payoutMethod === "credit" && <p className="text-[10px] text-app-text-muted">TeleMon 계정 크레딧으로 전환되어 요금제에 사용할 수 있습니다.</p>}
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
                {referredUsers.map((user) => <ReferredUserRow key={user.tenant_id} user={user} />)}
              </div>
            )}
          </Panel>

          {/* 커미션 내역 */}
          <Panel accent="emerald" title={`커미션 내역 (${commissions.length})`} description="1차(50~70%) + 2차(15%) 보상"
            action={commissions.length > 0 && (
              <button type="button" onClick={() => {
                fetch("/api/referral/commissions/csv").then(r => r.blob()).then(blob => {
                  const url = URL.createObjectURL(blob); const a = document.createElement("a");
                  a.href = url; a.download = `commissions-${new Date().toISOString().slice(0, 10)}.csv`;
                  a.click(); URL.revokeObjectURL(url);
                }).catch(() => toast("error", "CSV 내보내기에 실패했습니다."));
              }} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors">
                <Download className="h-3 w-3" /> CSV
              </button>
            )}>
            {commissions.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-app-text-muted">
                <Wallet className="mb-2 h-8 w-8 opacity-30" />
                <p className="text-xs">아직 발생한 커미션이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {commissions.map((c) => <CommissionRow key={c.id} commission={c} />)}
              </div>
            )}
          </Panel>

          {/* 정산 내역 + 즉시 지급 */}
          <Panel accent="purple" title="정산 내역" description="지급 요청 및 정산 이력">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="primary" className="w-full" onClick={handleRequestPayout} disabled={requestingPayout}>
                  {requestingPayout ? (
                    <><span className="mr-1.5 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> 처리 중...</>
                  ) : (
                    <><DollarSign className="mr-1.5 h-4 w-4" /> 정기 지급 요청</>
                  )}
                </Button>
                <Button variant="secondary" className="w-full" onClick={handleInstantCashout} disabled={instaCashing}>
                  {instaCashing ? (
                    <><span className="mr-1.5 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> 처리 중...</>
                  ) : (
                    <><Zap className="mr-1.5 h-4 w-4" /> 즉시 지급 (5% 수수료)</>
                  )}
                </Button>
              </div>
              <p className="text-[9px] text-app-text-muted text-center">즉시 지급은 수수료 5% 차감 후 바로 지급됩니다 (최소 1,000원)</p>

              {payouts.length > 0 && (
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {payouts.map((p) => <PayoutRow key={p.id} payout={p} />)}
                </div>
              )}
              {payouts.length === 0 && <p className="text-center text-[10px] text-app-text-muted">정산 내역이 없습니다.</p>}
            </div>
          </Panel>

          {/* 리더보드 */}
          {leaderboard.length > 0 && (
            <Panel accent="amber" title="총판 리더보드" description="커미션 수익 기준 TOP 랭킹">
              <div className="space-y-1.5">
                {leaderboard.slice(0, 10).map((entry) => <LeaderboardRow key={entry.referrer_id} entry={entry} />)}
              </div>
            </Panel>
          )}
        </>
      )}

      {/* ── QR Modal ── */}
      <AnimatePresence>
        {showQrModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowQrModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="w-72 rounded-2xl border border-app-border bg-app-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-app-text">QR 코드</h3>
                <button type="button" onClick={() => setShowQrModal(false)}
                  className="flex h-6 w-6 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-card-hover transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex justify-center">
                <Image 
                  src={qrCodeUrl} 
                  alt="Referral QR Code"
                  width={192}
                  height={192}
                  className="h-48 w-48 rounded-xl border border-app-border"
                  priority={false}
                  unoptimized // 동적으로 생성된 QR 코드이므로 최적화 비활성화
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
              <p className="mt-3 text-center text-[10px] text-app-text-muted">QR 코드를 스캔하여 가입하면 자동 추천됩니다</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <InlineError>{error}</InlineError>}
    </div>
  );
}
