"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Copy, ExternalLink, Share2, TrendingUp, Users, Wallet, CheckCircle2, AlertCircle } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useToast } from "@/components/ui/Toast";
import { InlineError } from "@/components/ui/InlineError";
import * as api from "@/lib/api_referral";

interface ReferralCodeInfo {
  code: string;
  created_at: string;
  is_active: boolean;
  uses: number;
}

interface ReferralCommission {
  id: string;
  referred_id: string;
  amount_cents: number;
  rate: number;
  status: string;
  payment_tx_id: string | null;
  paid_at: string | null;
  created_at: string;
}

interface ReferralStats {
  referral_code: string;
  total_referred: number;
  total_earnings_cents: number;
  uses: number;
}

export function ReferralTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDistributor, setIsDistributor] = useState(false);
  const [referralCode, setReferralCode] = useState<ReferralCodeInfo | null>(null);
  const [commissions, setCommissions] = useState<ReferralCommission[]>([]);
  const [stats, setStats] = useState<ReferralStats | null>(null);

  // 사용자 정보 가져오기
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 총판 상태 확인
        const distributorStatus = await api.checkDistributorStatus();
        setIsDistributor(distributorStatus.isDistributor);

        if (distributorStatus.isDistributor) {
          // 총판일 경우, 추천 코드 및 통계 정보 가져오기
          const codeData = await api.getMyReferralCode();
          setReferralCode(codeData);

          const statsData = await api.getReferralStats();
          setStats(statsData);

          const commissionsData = await api.getMyCommissions();
          setCommissions(commissionsData.items);
        } else {
          // 총판이 아닐 경우, 현재 추천 코드 정보만 가져오기
          try {
            const codeData = await api.getMyReferralCode();
            setReferralCode(codeData);
          } catch (err) {
            // 총판이 아니어도 추천 코드가 없을 수 있으므로 오류 무시
            console.log("Referral code not available yet");
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "사용자 정보를 불러오는데 실패했습니다.";
        setError(msg);
        console.error("Error fetching referral data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleRegisterAsDistributor = async () => {
    if (registering) return;

    try {
      setRegistering(true);
      setError(null);

      const result = await api.registerAsDistributor();
      
      if (result.success) {
        setIsDistributor(true);
        toast("success", "총판 등록 완료", { description: result.message });

        // 새로 고침하여 정보 업데이트
        const codeData = await api.getMyReferralCode();
        setReferralCode(codeData);

        const statsData = await api.getReferralStats();
        setStats(statsData);

        const commissionsData = await api.getMyCommissions();
        setCommissions(commissionsData.items);
      } else {
        toast("error", "총판 등록 실패", { description: result.message || "총판 등록에 실패했습니다." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "총판 등록에 실패했습니다.";
      setError(msg);
      toast("error", "총판 등록 실패", { description: msg });
    } finally {
      setRegistering(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast("success", "복사 완료", { description: "링크가 클립보드에 복사되었습니다." });
  };

  const referralLink = referralCode ? `${window.location.origin}/signup?ref=${referralCode.code}` : '';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-app-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 총판 등록 패널 */}
      {!isDistributor && (
        <Panel 
          title="총판 등록" 
          description="추천인으로 등록하고 커미션을 받아가세요."
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-gradient-to-r from-app-primary/10 to-app-gold/10 border border-app-primary/20">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-app-primary/20">
                  <Share2 className="h-5 w-5 text-app-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-app-text mb-1">총판이 되어보세요!</h3>
                  <p className="text-sm text-app-text-muted">
                    다른 사용자를 추천하여 수익을 창출할 수 있습니다. 총판 등록 후 추천 링크를 통해 사용자를 유입시키면,
                    해당 사용자의 결제 금액에서 커미션을 받을 수 있습니다.
                  </p>
                </div>
              </div>
            </div>

            <Button 
              variant="primary" 
              className="w-full" 
              onClick={handleRegisterAsDistributor}
              disabled={registering}
            >
              {registering ? (
                <><span className="animate-spin mr-2">⏳</span> 등록 중...</>
              ) : (
                <><Share2 className="mr-2 h-4 w-4" /> 총판 등록하기</>
              )}
            </Button>

            {error && <InlineError>{error}</InlineError>}
          </div>
        </Panel>
      )}

      {/* 총판 정보 패널 */}
      {isDistributor && (
        <Panel 
          title="내 추천 정보" 
          description="내 추천 코드와 통계를 확인하세요."
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl border border-app-border bg-app-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-app-primary" />
                <span className="text-xs text-app-text-muted">총 추천 수</span>
              </div>
              <p className="text-xl font-bold text-app-text">{stats?.total_referred || 0}명</p>
            </div>
            
            <div className="rounded-xl border border-app-border bg-app-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-4 w-4 text-app-primary" />
                <span className="text-xs text-app-text-muted">총 수익</span>
              </div>
              <p className="text-xl font-bold text-app-text">${(stats?.total_earnings_cents ? stats.total_earnings_cents / 100 : 0).toFixed(2)}</p>
            </div>
            
            <div className="rounded-xl border border-app-border bg-app-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-app-primary" />
                <span className="text-xs text-app-text-muted">링크 사용 수</span>
              </div>
              <p className="text-xl font-bold text-app-text">{stats?.uses || 0}회</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-app-border bg-app-card p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-app-text">내 추천 링크</h3>
                <Badge tone="info">총판 전용</Badge>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  className="flex-1 px-3 py-2 text-sm bg-app-surface border border-app-border rounded-lg truncate"
                />
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => copyToClipboard(referralLink)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-app-text-muted mt-2">
                이 링크를 통해 가입한 사용자는 자동으로 귀하의 추천 하위로 등록됩니다.
              </p>
            </div>

            <Button 
              variant="secondary" 
              className="w-full" 
              onClick={() => copyToClipboard(referralLink)}
            >
              <Share2 className="mr-2 h-4 w-4" /> 링크 공유하기
            </Button>
          </div>
        </Panel>
      )}

      {/* 커미션 내역 */}
      {isDistributor && commissions && commissions.length > 0 && (
        <Panel 
          title="커미션 내역" 
          description="받은 커미션 내역을 확인하세요."
        >
          <div className="space-y-3">
            {commissions.map((commission, index) => (
              <motion.div
                key={commission.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-3 rounded-xl border border-app-border bg-app-card"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${commission.status === 'paid' ? 'bg-app-success/10' : 'bg-app-warning/10'}`}>
                    {commission.status === 'paid' ? 
                      <CheckCircle2 className="h-4 w-4 text-app-success" /> : 
                      <AlertCircle className="h-4 w-4 text-app-warning" />
                    }
                  </div>
                  <div>
                    <p className="text-sm font-medium text-app-text">
                      ${commission.amount_cents / 100}
                    </p>
                    <p className="text-xs text-app-text-muted">
                      {new Date(commission.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Badge 
                  tone={commission.status === 'paid' ? 'success' : 'warning'}
                >
                  {commission.status === 'paid' ? '지급 완료' : '대기 중'}
                </Badge>
              </motion.div>
            ))}
          </div>
        </Panel>
      )}

      {error && <InlineError>{error}</InlineError>}
    </div>
  );
}