import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, ShieldAlert, User } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { useDashboardStore } from "@/store/useDashboardStore";
import { getAccountDisplayName, type AccountHealthItem, type AccountHealthState } from "@/types";
import * as api from "@/lib/api";

const HEALTH_LABEL: Record<AccountHealthState, { label: string; tone: "success" | "warning" | "danger" | "neutral" | "info" }> = {
  healthy: { label: "정상", tone: "success" },
  unauthorized: { label: "세션 만료", tone: "warning" },
  banned: { label: "차단됨", tone: "danger" },
  rate_limited: { label: "제한됨", tone: "warning" },
  error: { label: "오류", tone: "danger" },
  unknown: { label: "미확인", tone: "neutral" },
  not_configured: { label: "미설정", tone: "neutral" },
};

const RECOVERY_GUIDANCE: Partial<Record<AccountHealthState, string>> = {
  unauthorized: "계정 등록 탭에서 해당 계정의 인증번호를 재전송하고 다시 인증해주세요.",
  rate_limited: "잠시 후 자동으로 복구됩니다. 발송 간격을 조정하세요.",
  not_configured: "계정 등록 탭에서 전화번호 인증을 완료해주세요.",
  banned: "Telegram에서 계정이 차단되었습니다. 다른 계정을 사용해주세요.",
  error: "발송 중 오류가 발생했습니다. 발송 로그에서 자세한 내용을 확인하세요.",
};

export function ProfileInspector() {
  const accounts = useDashboardStore((s) => s.accounts);
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const account = accounts.find((a) => a.id === selectedAccountId);
  const [health, setHealth] = useState<AccountHealthItem | null>(null);
  const bgPollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pollTick, setPollTick] = useState(0);

  const loadHealth = useCallback(async () => {
    if (!selectedAccountId) { setHealth(null); return; }
    try {
      const items = await api.fetchAccountHealth();
      const found = items.find((h) => h.accountId === selectedAccountId);
      setHealth(found ?? null);
    } catch { /* ignore */ }
  }, [selectedAccountId]);

  useEffect(() => {
    loadHealth();
  }, [loadHealth]);

  // 30s background polling
  useEffect(() => {
    if (bgPollTimer.current) clearTimeout(bgPollTimer.current);
    if (!selectedAccountId) return;
    bgPollTimer.current = setTimeout(() => { loadHealth(); setPollTick((t) => t + 1); }, 30000);
    return () => {
      if (bgPollTimer.current) clearTimeout(bgPollTimer.current);
    };
  }, [pollTick, selectedAccountId, loadHealth]);

  if (!account) {
    return (
      <Panel title="계정 정보">
        <p className="text-xs text-app-text-muted">계정을 선택하세요</p>
      </Panel>
    );
  }

  const healthMeta = health ? HEALTH_LABEL[health.status] : null;

  return (
    <div className="space-y-4">
      <Panel title="계정 정보">
        <ul className="space-y-2 text-xs">
          <li className="flex justify-between">
            <span className="text-app-text-muted">이름</span>
            <span className="text-app-text">{getAccountDisplayName(account)}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-app-text-muted">전화번호</span>
            <span className="text-app-text">{account.phone}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-app-text-muted">상태</span>
            <span className="text-app-text">{account.status === "active" ? "활성" : account.status === "inactive" ? "비활성" : "차단됨"}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-app-text-muted">상태 진단</span>
            <span>
              {healthMeta ? (
                <Badge tone={healthMeta.tone}>{healthMeta.label}</Badge>
              ) : (
                <span className="text-app-text-subtle">로딩 중...</span>
              )}
            </span>
          </li>
          <li className="flex justify-between">
            <span className="text-app-text-muted">가입일</span>
            <span className="text-app-text">{new Date(account.createdAt).toLocaleDateString("ko-KR")}</span>
          </li>
        </ul>
      </Panel>

      {health && health.status !== "healthy" && (
        <Panel title="복구 안내">
          <div className="flex items-start gap-2 text-xs">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-app-warning" />
            <p className="text-app-text-muted">
              {RECOVERY_GUIDANCE[health.status] ?? "자세한 내용은 로그 탭을 확인하세요."}
            </p>
          </div>
        </Panel>
      )}

      {health && health.lastError && (
        <Panel title="마지막 오류">
          <p className="text-xs text-app-danger">{health.lastError}</p>
        </Panel>
      )}

      <Panel title="사용량">
        <ul className="space-y-2 text-xs">
          <li className="flex items-center gap-2">
            <User className="h-3 w-3 text-app-text-muted" />
            <span className="text-app-text-muted">참여 그룹:</span>
            <span className="text-app-text">{account.groupCount}개</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-3 w-3 text-app-text-muted" />
            <span className="text-app-text-muted">오늘 발송:</span>
            <span className="text-app-text">{account.todaySent}건</span>
          </li>
          <li className="flex items-center gap-2">
            <ShieldAlert className="h-3 w-3 text-app-text-muted" />
            <span className="text-app-text-muted">자동 응답:</span>
            <span className="text-app-text">{account.autoReplyEnabled ? "켜짐" : "꺼짐"}</span>
          </li>
          {health && (
            <>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-app-success" />
                <span className="text-app-text-muted">최근 7일 성공:</span>
                <span className="text-app-text">{health.recentSuccessCount}건</span>
              </li>
              <li className="flex items-center gap-2">
                <AlertTriangle className="h-3 w-3 text-app-danger" />
                <span className="text-app-text-muted">최근 7일 실패:</span>
                <span className="text-app-text">{health.recentFailureCount}건</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-app-text-muted" />
                <span className="text-app-text-muted">마지막 활동:</span>
                <span className="text-app-text">{health.lastActivity ? new Date(health.lastActivity).toLocaleString("ko-KR") : "없음"}</span>
              </li>
            </>
          )}
        </ul>
      </Panel>
    </div>
  );
}
