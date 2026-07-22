"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  Plus, Trash2, Play, Pause, AlertTriangle, CheckCircle2, XCircle,
  Clock, Bell, LogIn, RefreshCw, Send, GripVertical, Workflow, Save,
  Loader2, Copy, Zap,
} from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/cn";

// ─── Types ──────────────────────────────────────────────────────────

type TriggerType = "send_success" | "send_failure" | "account_banned" | "schedule" | "manual";
type ActionType = "send_to_group" | "switch_account_retry" | "send_notification" | "log_record" | "stop_broadcast";

interface ChainStep {
  id: string;
  trigger: TriggerType;
  action: ActionType;
  triggerConfig: Record<string, string>;
  actionConfig: Record<string, string>;
}

interface Chain {
  id: string;
  name: string;
  steps: ChainStep[];
  isActive: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────

const STORAGE_KEY = "telemon-action-chains";

const TRIGGER_OPTIONS: { value: TriggerType; label: string; icon: React.ComponentType<{ className?: string }>; desc: string; color: string }[] = [
  { value: "send_success", label: "발송 성공", icon: CheckCircle2, desc: "메시지 발송이 성공하면", color: "border-l-app-success" },
  { value: "send_failure", label: "발송 실패", icon: XCircle, desc: "메시지 발송이 실패하면", color: "border-l-app-danger" },
  { value: "account_banned", label: "계정 차단", icon: AlertTriangle, desc: "계정이 차단되면", color: "border-l-app-danger" },
  { value: "schedule", label: "스케줄", icon: Clock, desc: "특정 시간이 되면", color: "border-l-app-info" },
  { value: "manual", label: "수동 실행", icon: Play, desc: "수동으로 실행할 때", color: "border-l-app-warning" },
];

const ACTION_OPTIONS: { value: ActionType; label: string; icon: React.ComponentType<{ className?: string }>; desc: string; color: string }[] = [
  { value: "send_to_group", label: "다른 그룹 발송", icon: Send, desc: "지정된 그룹에 메시지 전송", color: "border-r-app-primary" },
  { value: "switch_account_retry", label: "계정 전환 재시도", icon: RefreshCw, desc: "다른 계정으로 재발송", color: "border-r-app-warning" },
  { value: "send_notification", label: "알림 보내기", icon: Bell, desc: "운영자에게 알림 전송", color: "border-r-app-info" },
  { value: "log_record", label: "로그 기록", icon: LogIn, desc: "이벤트를 로그에 기록", color: "border-r-app-text-muted" },
  { value: "stop_broadcast", label: "발송 중단", icon: XCircle, desc: "진행 중인 발송 중단", color: "border-r-app-danger" },
];

const TRIGGER_CONFIG_FIELDS: Partial<Record<TriggerType, { key: string; label: string; placeholder: string }[]>> = {
  schedule: [
    { key: "cron", label: "Cron 표현식", placeholder: "예: 0 9 * * * (매일 09:00)" },
    { key: "timezone", label: "시간대", placeholder: "예: Asia/Seoul" },
  ],
  manual: [],
  send_success: [
    { key: "filter_keyword", label: "필터 키워드 (선택)", placeholder: "특정 키워드 포함 시에만" },
  ],
  send_failure: [],
  account_banned: [],
};

const ACTION_CONFIG_FIELDS: Partial<Record<ActionType, { key: string; label: string; placeholder: string }[]>> = {
  send_to_group: [
    { key: "group_id", label: "대상 그룹 ID", placeholder: "그룹 ID 입력" },
    { key: "message_template", label: "메시지 템플릿 (선택)", placeholder: "기존 메시지를 그대로 발송" },
  ],
  switch_account_retry: [
    { key: "max_retries", label: "최대 재시도 횟수", placeholder: "예: 3" },
  ],
  send_notification: [
    { key: "webhook_url", label: "Webhook URL", placeholder: "https://hooks.example.com/alert" },
    { key: "message", label: "알림 메시지", placeholder: "예: 발송 실패가 발생했습니다" },
  ],
  log_record: [
    { key: "log_level", label: "로그 레벨", placeholder: "info, warn, error" },
  ],
  stop_broadcast: [],
};

function getTriggerDef(type: TriggerType) {
  return TRIGGER_OPTIONS.find((t) => t.value === type);
}

function getActionDef(type: ActionType) {
  return ACTION_OPTIONS.find((a) => a.value === type);
}

let _stepCounter = 0;
function generateStepId() {
  _stepCounter += 1;
  return `step-${Date.now()}-${_stepCounter}`;
}

function generateChainId() {
  return `chain-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyStep(): ChainStep {
  return {
    id: generateStepId(),
    trigger: "send_success",
    action: "send_to_group",
    triggerConfig: {},
    actionConfig: {},
  };
}

// ─── Preset Examples ────────────────────────────────────────────────

const PRESET_CHAINS: Chain[] = [
  {
    id: "preset-1",
    name: "발송 실패 시 계정 전환 재시도",
    isActive: true,
    steps: [
      {
        id: "preset-1-step-1",
        trigger: "send_failure",
        action: "switch_account_retry",
        triggerConfig: {},
        actionConfig: { max_retries: "3" },
      },
    ],
  },
  {
    id: "preset-2",
    name: "계정 차단 → 알림 → 중단",
    isActive: true,
    steps: [
      {
        id: "preset-2-step-1",
        trigger: "account_banned",
        action: "send_notification",
        triggerConfig: {},
        actionConfig: { webhook_url: "", message: "계정이 차단되었습니다" },
      },
      {
        id: "preset-2-step-2",
        trigger: "account_banned",
        action: "stop_broadcast",
        triggerConfig: {},
        actionConfig: {},
      },
    ],
  },
  {
    id: "preset-3",
    name: "스케줄 알림 발송",
    isActive: true,
    steps: [
      {
        id: "preset-3-step-1",
        trigger: "schedule",
        action: "send_to_group",
        triggerConfig: { cron: "0 9 * * *", timezone: "Asia/Seoul" },
        actionConfig: { group_id: "", message_template: "오늘의 발송을 시작합니다" },
      },
    ],
  },
  {
    id: "preset-4",
    name: "발송 성공 시 로그 기록",
    isActive: true,
    steps: [
      {
        id: "preset-4-step-1",
        trigger: "send_success",
        action: "log_record",
        triggerConfig: { filter_keyword: "" },
        actionConfig: { log_level: "info" },
      },
    ],
  },
  {
    id: "preset-5",
    name: "수동 실행 → 그룹 발송 → 알림",
    isActive: false,
    steps: [
      {
        id: "preset-5-step-1",
        trigger: "manual",
        action: "send_to_group",
        triggerConfig: {},
        actionConfig: { group_id: "", message_template: "" },
      },
      {
        id: "preset-5-step-2",
        trigger: "send_success",
        action: "send_notification",
        triggerConfig: {},
        actionConfig: { webhook_url: "", message: "수동 발송이 완료되었습니다" },
      },
    ],
  },
];

// ─── Step Row Component ─────────────────────────────────────────────

function StepRow({
  step,
  index,
  onUpdate,
  onDelete,
  onDragEnd,
}: {
  step: ChainStep;
  index: number;
  onUpdate: (step: ChainStep) => void;
  onDelete: () => void;
  onDragEnd: () => void;
}) {
  const triggerDef = getTriggerDef(step.trigger);
  const actionDef = getActionDef(step.action);
  const triggerIcon = triggerDef ? triggerDef.icon : Zap;
  const actionIcon = actionDef ? actionDef.icon : Zap;
  const triggerFields = TRIGGER_CONFIG_FIELDS[step.trigger] ?? [];
  const actionFields = ACTION_CONFIG_FIELDS[step.action] ?? [];

  return (
    <Reorder.Item
      value={step}
      id={step.id}
      onDragEnd={onDragEnd}
      className={cn(
        "group flex flex-col gap-3 rounded-xl border bg-app-card p-3 cursor-grab active:cursor-grabbing transition-all",
        triggerDef?.color ? `border-l-4 ${triggerDef.color}` : "border-l-4 border-l-transparent",
        actionDef?.color ? `border-r-4 ${actionDef.color}` : "border-r-4 border-r-transparent",
        "border-y border-app-border",
      )}
    >
      <div className="flex items-start gap-3">
        {/* Drag handle */}
        <div className="flex shrink-0 items-center pt-1 text-app-text-subtle">
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Step number */}
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-app-card-hover text-[11px] font-semibold text-app-text-muted tabular-nums">
          {index + 1}
        </div>

        {/* Trigger */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-medium text-app-text-muted uppercase tracking-wider">트리거</span>
          </div>
          <select
            value={step.trigger}
            onChange={(e) => onUpdate({ ...step, trigger: e.target.value as TriggerType, triggerConfig: {} })}
            className="w-full rounded-lg border border-app-border bg-app-bg px-2.5 py-1.5 text-xs text-app-text outline-none focus:border-app-primary/60"
          >
            {TRIGGER_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label} — {t.desc}</option>
            ))}
          </select>
          {triggerFields.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {triggerFields.map((field) => (
                <input
                  key={field.key}
                  type="text"
                  value={step.triggerConfig[field.key] ?? ""}
                  onChange={(e) => onUpdate({ ...step, triggerConfig: { ...step.triggerConfig, [field.key]: e.target.value } })}
                  placeholder={field.placeholder}
                  className="w-full rounded-lg border border-app-border bg-app-bg px-2.5 py-1.5 text-xs text-app-text outline-none focus:border-app-primary/60 placeholder:text-app-text-subtle"
                />
              ))}
            </div>
          )}
        </div>

        {/* Arrow connector */}
        <div className="flex shrink-0 items-center pt-6 px-1">
          <div className="flex items-center gap-1 text-app-text-muted">
            <div className="h-px w-4 bg-app-border" />
            <span className="text-xs">→</span>
            <div className="h-px w-4 bg-app-border" />
          </div>
        </div>

        {/* Action */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-medium text-app-text-muted uppercase tracking-wider">액션</span>
          </div>
          <select
            value={step.action}
            onChange={(e) => onUpdate({ ...step, action: e.target.value as ActionType, actionConfig: {} })}
            className="w-full rounded-lg border border-app-border bg-app-bg px-2.5 py-1.5 text-xs text-app-text outline-none focus:border-app-primary/60"
          >
            {ACTION_OPTIONS.map((a) => (
              <option key={a.value} value={a.value}>{a.label} — {a.desc}</option>
            ))}
          </select>
          {actionFields.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {actionFields.map((field) => (
                <input
                  key={field.key}
                  type="text"
                  value={step.actionConfig[field.key] ?? ""}
                  onChange={(e) => onUpdate({ ...step, actionConfig: { ...step.actionConfig, [field.key]: e.target.value } })}
                  placeholder={field.placeholder}
                  className="w-full rounded-lg border border-app-border bg-app-bg px-2.5 py-1.5 text-xs text-app-text outline-none focus:border-app-primary/60 placeholder:text-app-text-subtle"
                />
              ))}
            </div>
          )}
        </div>

        {/* Delete */}
        <button
          type="button"
          onClick={onDelete}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-app-text-muted opacity-0 group-hover:opacity-100 transition-all hover:text-app-danger hover:bg-app-danger-muted/20"
          aria-label="단계 삭제"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </Reorder.Item>
  );
}

// ─── Chain Card Component ───────────────────────────────────────────

function ChainCard({
  chain,
  index,
  onChange,
  onDelete,
  onToggleActive,
}: {
  chain: Chain;
  index: number;
  onChange: (chain: Chain) => void;
  onDelete: () => void;
  onToggleActive: () => void;
}) {
  const TriggerIcon = chain.steps.length > 0
    ? (getTriggerDef(chain.steps[0].trigger)?.icon ?? Zap)
    : Zap;
  const ActionIcon = chain.steps.length > 0
    ? (getActionDef(chain.steps[chain.steps.length - 1].action)?.icon ?? Zap)
    : Zap;

  function updateStep(stepIndex: number, updated: ChainStep) {
    const next = [...chain.steps];
    next[stepIndex] = updated;
    onChange({ ...chain, steps: next });
  }

  function deleteStep(stepIndex: number) {
    onChange({ ...chain, steps: chain.steps.filter((_, i) => i !== stepIndex) });
  }

  function addStep() {
    onChange({ ...chain, steps: [...chain.steps, createEmptyStep()] });
  }

  function reorderSteps(steps: ChainStep[]) {
    onChange({ ...chain, steps });
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="rounded-2xl border border-app-border bg-app-card overflow-hidden transition-all hover:shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-app-border px-4 py-3">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            chain.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-app-card-hover text-app-text-muted",
          )}
        >
          {chain.isActive ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={chain.name}
            onChange={(e) => onChange({ ...chain, name: e.target.value })}
            placeholder="체인 이름 입력..."
            className="w-full bg-transparent text-sm font-semibold text-app-text outline-none placeholder:text-app-text-subtle"
          />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onToggleActive}
            className={cn(
              "flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-medium transition-colors",
              chain.isActive
                ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                : "bg-app-card-hover text-app-text-muted hover:text-app-text",
            )}
          >
            {chain.isActive ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
            {chain.isActive ? "활성" : "비활성"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-app-text-muted hover:text-app-danger hover:bg-app-danger-muted/20 transition-colors"
            aria-label="체인 삭제"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Steps */}
      <div className="p-4 space-y-3">
        <Reorder.Group axis="y" values={chain.steps} onReorder={reorderSteps} className="space-y-2">
          <AnimatePresence initial={false}>
            {chain.steps.map((step, i) => (
              <StepRow
                key={step.id}
                step={step}
                index={i}
                onUpdate={(updated) => updateStep(i, updated)}
                onDelete={() => deleteStep(i)}
                onDragEnd={() => {}}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>

        <button
          type="button"
          onClick={addStep}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-app-border py-2.5 text-xs font-medium text-app-text-muted hover:border-app-primary/30 hover:text-app-primary transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          단계 추가
        </button>
      </div>

      {/* Footer summary */}
      <div className="flex items-center gap-2 border-t border-app-border px-4 py-2 bg-app-bg/50">
        <Badge tone="neutral" className="text-[10px]">
          {chain.steps.length}단계
        </Badge>
        {chain.steps.length > 0 && (
          <>
            <div className="flex items-center gap-1 text-[11px] text-app-text-muted">
              <TriggerIcon className="h-3 w-3" />
              <span className="truncate max-w-[80px]">{getTriggerDef(chain.steps[0].trigger)?.label}</span>
            </div>
            <span className="text-[11px] text-app-text-subtle">→</span>
            <div className="flex items-center gap-1 text-[11px] text-app-text-muted">
              <ActionIcon className="h-3 w-3" />
              <span className="truncate max-w-[100px]">{getActionDef(chain.steps[chain.steps.length - 1].action)?.label}</span>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Tab ───────────────────────────────────────────────────────

export function ActionChainTab() {
  const [chains, setChains] = useState<Chain[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Chain[];
        setChains(parsed);
      }
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  // Save to localStorage
  const saveToStorage = useCallback(() => {
    setSaving(true);
    setSaved(false);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chains));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ }
    setSaving(false);
  }, [chains]);

  function addChain() {
    const newChain: Chain = {
      id: generateChainId(),
      name: "",
      steps: [createEmptyStep()],
      isActive: true,
    };
    setChains((prev) => [newChain, ...prev]);
  }

  function updateChain(updated: Chain) {
    setChains((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  function deleteChain(id: string) {
    setChains((prev) => prev.filter((c) => c.id !== id));
  }

  function toggleChainActive(id: string) {
    setChains((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c)),
    );
  }

  function loadPresets() {
    const presetCopy: Chain[] = PRESET_CHAINS.map((p) => ({
      ...p,
      id: generateChainId(),
      steps: p.steps.map((s) => ({ ...s, id: generateStepId() })),
    }));
    setChains((prev) => [...presetCopy, ...prev]);
  }

  function clearAll() {
    if (chains.length === 0) return;
    setConfirmDeleteAll(true);

  const totalSteps = chains.reduce((acc, c) => acc + c.steps.length, 0);
  const activeCount = chains.filter((c) => c.isActive).length;
  const hasChains = chains.length > 0;

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10">
          <Workflow className="h-5 w-5 text-violet-500" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold text-app-text">액션 체인 빌더</h2>
          <p className="text-xs text-app-text-muted">트리거 → 액션 시각적 워크플로우</p>
        </div>
        <button
          onClick={loadPresets}
          className="flex items-center gap-1.5 rounded-lg border border-app-border px-3 py-1.5 text-xs font-medium text-app-text-muted hover:border-app-border-strong hover:text-app-text transition-colors"
        >
          <Copy className="h-3.5 w-3.5" />
          예제 불러오기
        </button>
        <button
          onClick={addChain}
          className="flex items-center gap-1.5 rounded-lg bg-app-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
        >
          <Plus className="h-3.5 w-3.5" />
          새 체인
        </button>
      </div>

      {/* Stats */}
      {hasChains && (
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="rounded-lg bg-app-card border border-app-border px-2.5 py-1">
            전체 <strong>{chains.length}</strong>
          </span>
          <span className="rounded-lg bg-app-card border border-app-border px-2.5 py-1">
            활성 <strong>{activeCount}</strong>
          </span>
          <span className="rounded-lg bg-app-card border border-app-border px-2.5 py-1 text-app-text-muted">
            단계 <strong>{totalSteps}</strong>
          </span>
          {chains.length > 0 && (
            <button
              onClick={clearAll}
              className="rounded-lg px-2.5 py-1 text-app-text-muted hover:text-app-danger transition-colors"
            >
              전체 삭제
            </button>
          )}
        </div>
      )}

      {/* Loading state */}
      {!loaded ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-app-primary" />
        </div>
      ) : !hasChains ? (
        /* Empty state */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center py-16 text-app-text-muted gap-3"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-app-card border border-app-border">
            <Workflow className="h-7 w-7 opacity-30" />
          </div>
          <p className="text-sm font-medium text-app-text-secondary">아직 액션 체인이 없습니다</p>
          <p className="text-xs">트리거와 액션을 연결하여 발송 자동화 워크플로우를 만드세요</p>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={addChain}
              className="flex items-center gap-1.5 rounded-lg bg-app-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
            >
              <Plus className="h-3.5 w-3.5" />
              첫 체인 만들기
            </button>
            <button
              onClick={loadPresets}
              className="flex items-center gap-1.5 rounded-lg border border-app-border px-4 py-2 text-xs font-medium text-app-text-muted hover:border-app-border-strong hover:text-app-text transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
              예제 불러오기
            </button>
          </div>
        </motion.div>
      ) : (
        /* Chain list */
        <div className="space-y-3">
          <AnimatePresence>
            {chains.map((chain) => (
              <ChainCard
                key={chain.id}
                chain={chain}
                index={0}
                onChange={updateChain}
                onDelete={() => deleteChain(chain.id)}
                onToggleActive={() => toggleChainActive(chain.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Save button */}
      {hasChains && (
        <div className="flex items-center justify-end gap-3 border-t border-app-border pt-4">
          <p className="text-[11px] text-app-text-muted">
            {chains.length}개 체인 · {totalSteps}개 단계
          </p>
          <Button
            variant="primary"
            size="md"
            loading={saving}
            onClick={saveToStorage}
            className="min-w-[100px]"
          >
            {saved ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                저장됨
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                저장
              </>
            )}
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={confirmDeleteAll}
        title="전체 삭제"
        description="모든 액션 체인을 삭제하시겠습니까?"
        confirmLabel="삭제"
        cancelLabel="취소"
        onConfirm={() => { setChains([]); localStorage.removeItem(STORAGE_KEY); setConfirmDeleteAll(false); }}
        onCancel={() => setConfirmDeleteAll(false)}
      />
    </div>
  );
}
