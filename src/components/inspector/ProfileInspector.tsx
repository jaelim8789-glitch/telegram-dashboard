"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, ShieldAlert, User } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { useDashboardStore } from "@/store/useDashboardStore";
import { getAccountDisplayName, type AccountHealthItem, type AccountHealthState } from "@/types";
import * as api from "@/lib/api";

const HEALTH_LABEL: Record<AccountHealthState, { label: string; tone: "success" | "warning" | "danger" | "neutral" | "info" }> = {
  healthy: { label: "?•ìƒ", tone: "success" },
  unauthorized: { label: "?¸ì…˜ ë§Œë£Œ", tone: "warning" },
  banned: { label: "ì°¨ë‹¨??, tone: "danger" },
  restricted: { label: "?œì¬ ?˜ì‹¬", tone: "danger" },
  rate_limited: { label: "?œí•œ??, tone: "warning" },
  error: { label: "?¤ë¥˜", tone: "danger" },
  unknown: { label: "ë¯¸í™•??, tone: "neutral" },
  not_configured: { label: "ë¯¸ì„¤??, tone: "neutral" },
};

const RECOVERY_GUIDANCE: Partial<Record<AccountHealthState, string>> = {
  unauthorized: "ê³„ì • ?±ë¡ ??—???´ë‹¹ ê³„ì •???¸ì¦ë²ˆí˜¸ë¥??¬ì „?¡í•˜ê³??¤ì‹œ ?¸ì¦?´ì£¼?¸ìš”.",
  rate_limited: "? ì‹œ ???ë™?¼ë¡œ ë³µêµ¬?©ë‹ˆ?? ë°œì†¡ ê°„ê²©??ì¡°ì •?˜ì„¸??",
  not_configured: "ê³„ì • ?±ë¡ ??—???„í™”ë²ˆí˜¸ ?¸ì¦???„ë£Œ?´ì£¼?¸ìš”.",
  banned: "Telegram?ì„œ ê³„ì •??ì°¨ë‹¨?˜ì—ˆ?µë‹ˆ?? ?¤ë¥¸ ê³„ì •???¬ìš©?´ì£¼?¸ìš”.",
  restricted: "??ê³„ì •???”ë ˆê·¸ë¨ ?œì¬ë¥?ë°›ì•˜?????ˆìŠµ?ˆë‹¤. ë°œì†¡???¼ì‹œ ì¤‘ë‹¨?˜ì—ˆ?µë‹ˆ?? ?”ë ˆê·¸ë¨?ì„œ ê³„ì • ?íƒœë¥??•ì¸?˜ê³ , ë¬¸ì œê°€ ?†ë‹¤ë©?ê³„ì • ?±ë¡ ??—???íƒœë¥??¤ì‹œ ?œì„±?”í•´ì£¼ì„¸??",
  error: "ë°œì†¡ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤. ë°œì†¡ ë¡œê·¸?ì„œ ?ì„¸???´ìš©???•ì¸?˜ì„¸??",
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
      <Panel title="ê³„ì • ?•ë³´">
        <p className="text-xs text-app-text-muted">ê³„ì •??? íƒ?˜ì„¸??/p>
      </Panel>
    );
  }

  const healthMeta = health ? HEALTH_LABEL[health.status] : null;

  return (
    <div className="space-y-4">
      <Panel title="ê³„ì • ?•ë³´">
        <ul className="space-y-2 text-xs">
          <li className="flex justify-between">
            <span className="text-app-text-muted">?´ë¦„</span>
            <span className="text-app-text">{getAccountDisplayName(account)}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-app-text-muted">?„í™”ë²ˆí˜¸</span>
            <span className="text-app-text">{account.phone}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-app-text-muted">?íƒœ</span>
            <span className="text-app-text">{account.status === "active" ? "?œì„±" : account.status === "inactive" ? "ë¹„í™œ?? : "ì°¨ë‹¨??}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-app-text-muted">?íƒœ ì§„ë‹¨</span>
            <span>
              {healthMeta ? (
                <Badge tone={healthMeta.tone}>{healthMeta.label}</Badge>
              ) : (
                <span className="text-app-text-subtle">ë¡œë”© ì¤?..</span>
              )}
            </span>
          </li>
          <li className="flex justify-between">
            <span className="text-app-text-muted">ê°€?…ì¼</span>
            <span className="text-app-text">{new Date(account.createdAt).toLocaleDateString("ko-KR")}</span>
          </li>
        </ul>
      </Panel>

      {health && health.status !== "healthy" && (
        <Panel title="ë³µêµ¬ ?ˆë‚´">
          <div className="flex items-start gap-2 text-xs">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-app-warning" />
            <p className="text-app-text-muted">
              {RECOVERY_GUIDANCE[health.status] ?? "?ì„¸???´ìš©?€ ë¡œê·¸ ??„ ?•ì¸?˜ì„¸??"}
            </p>
          </div>
        </Panel>
      )}

      {health && health.lastError && (
        <Panel title="ë§ˆì?ë§??¤ë¥˜">
          <p className="text-xs text-app-danger">{health.lastError}</p>
        </Panel>
      )}

      <Panel title="?¬ìš©??>
        <ul className="space-y-2 text-xs">
          <li className="flex items-center gap-2">
            <User className="h-3 w-3 text-app-text-muted" />
            <span className="text-app-text-muted">ì°¸ì—¬ ê·¸ë£¹:</span>
            <span className="text-app-text">{account.groupCount}ê°?/span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-3 w-3 text-app-text-muted" />
            <span className="text-app-text-muted">?¤ëŠ˜ ë°œì†¡:</span>
            <span className="text-app-text">{account.todaySent}ê±?/span>
          </li>
          <li className="flex items-center gap-2">
            <ShieldAlert className="h-3 w-3 text-app-text-muted" />
            <span className="text-app-text-muted">?ë™ ?‘ë‹µ:</span>
            <span className="text-app-text">{account.autoReplyEnabled ? "ì¼œì§" : "êº¼ì§"}</span>
          </li>
          {health && (
            <>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-app-success" />
                <span className="text-app-text-muted">ìµœê·¼ 7???±ê³µ:</span>
                <span className="text-app-text">{health.recentSuccessCount}ê±?/span>
              </li>
              <li className="flex items-center gap-2">
                <AlertTriangle className="h-3 w-3 text-app-danger" />
                <span className="text-app-text-muted">ìµœê·¼ 7???¤íŒ¨:</span>
                <span className="text-app-text">{health.recentFailureCount}ê±?/span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-app-text-muted" />
                <span className="text-app-text-muted">ë§ˆì?ë§??œë™:</span>
                <span className="text-app-text">{health.lastActivity ? new Date(health.lastActivity).toLocaleString("ko-KR") : "?†ìŒ"}</span>
              </li>
            </>
          )}
        </ul>
      </Panel>
    </div>
  );
}
