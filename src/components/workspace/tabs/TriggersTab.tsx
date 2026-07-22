"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Workflow, Plus, ToggleLeft, ToggleRight, Trash2, Loader2, RefreshCw,
  Save, X, Zap, MessageCircle, UserPlus, Clock, Send, Bot, Bell, Globe,
  Edit3,
} from "lucide-react";
import * as triggerApi from "@/lib/trigger-api";

// ── Trigger/Action Icons ────────────────────────────────────────────

const TRIGGER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageCircle, UserPlus, Clock, Send,
};
const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Send, Bot, Bell, Globe,
};

function getTriggerIcon(type: string) {
  return TRIGGER_ICONS[type] ?? Zap;
}
function getActionIcon(type: string) {
  return ACTION_ICONS[type] ?? Zap;
}

// ─── Rule Editor Modal ──────────────────────────────────────────────

function RuleEditorModal({
  rule,
  triggerDefs,
  actionDefs,
  onSave,
  onClose,
}: {
  rule: Partial<triggerApi.TriggerRule> | null;
  triggerDefs: triggerApi.TriggerDef[];
  actionDefs: triggerApi.ActionDef[];
  onSave: (data: {
    name: string;
    description: string;
    trigger_type: string;
    trigger_config: Record<string, unknown>;
    actions: Record<string, unknown>[];
    is_active: boolean;
  }) => void;
  onClose: () => void;
}) {
  const isEditing = !!rule?.id;
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(rule?.name ?? "");
  const [description, setDescription] = useState(rule?.description ?? "");
  const [triggerType, setTriggerType] = useState(rule?.trigger_type ?? "");
  const [triggerConfig, setTriggerConfig] = useState<Record<string, unknown>>(
    (rule?.trigger_config as Record<string, unknown>) ?? {},
  );
  const [actions, setActions] = useState<Record<string, unknown>[]>(
    (rule?.actions as Record<string, unknown>[]) ?? [],
  );
  const [isActive, setIsActive] = useState(rule?.is_active ?? true);

  const selectedTriggerDef = triggerDefs.find((t) => t.id === triggerType);

  function addAction() {
    setActions((prev) => [...prev, { type: "", config: {} }]);
  }

  function updateAction(index: number, field: string, value: unknown) {
    setActions((prev) => {
      const next = [...prev];
      if (field === "type") {
        next[index] = { type: value, config: {} };
      } else {
        next[index] = { ...next[index], config: { ...(next[index].config as Record<string, unknown>), [field]: value } };
      }
      return next;
    });
  }

  function removeAction(index: number) {
    setActions((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    onSave({ name, description, trigger_type: triggerType, trigger_config: triggerConfig, actions, is_active: isActive });
  }

  const isValid = name.trim() && triggerType;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-2xl border border-app-border bg-app-card p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-app-primary/10">
            {isEditing ? <Edit3 className="h-5 w-5 text-app-primary" /> : <Plus className="h-5 w-5 text-app-primary" />}
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-app-text">
              {isEditing ? "규칙 수정" : "새 규칙 만들기"}
            </h3>
            <p className="text-xs text-app-text-muted">트리거와 액션을 연결하세요</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-app-card-hover text-app-text-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-app-text-secondary">규칙 이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 신규 가입자 환영 메시지"
              className="focus-ring w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text placeholder:text-app-text-subtle"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-app-text-secondary">설명 (선택)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="이 규칙이做什么..."
              rows={2}
              className="focus-ring w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text placeholder:text-app-text-subtle resize-none"
            />
          </div>

          {/* Trigger Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-app-text-secondary">트리거</label>
            <div className="grid grid-cols-2 gap-1.5">
              {triggerDefs.map((t) => {
                const Icon = getTriggerIcon(t.id);
                const isSelected = triggerType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTriggerType(t.id);
                      setTriggerConfig({});
                    }}
                    className={`flex items-center gap-2 rounded-lg border p-2.5 text-left transition-all ${
                      isSelected
                        ? "border-app-primary bg-app-primary/5 text-app-primary"
                        : "border-app-border bg-app-bg text-app-text-secondary hover:border-app-primary/30"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isSelected ? "text-app-primary" : "text-app-text-muted"}`} />
                    <div className="min-w-0">
                      <p className={`text-xs font-medium ${isSelected ? "text-app-text" : "text-app-text"}`}>{t.label}</p>
                      <p className="text-[10px] text-app-text-muted truncate">{t.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Trigger Config (keyword input for message_received) */}
          {selectedTriggerDef && selectedTriggerDef.params.length > 0 && (
            <div className="space-y-1.5">
              {selectedTriggerDef.params.map((param) => (
                <div key={param.key}>
                  <label className="text-xs font-medium text-app-text-secondary">{param.label}</label>
                  <input
                    type="text"
                    value={(triggerConfig[param.key] as string) ?? ""}
                    onChange={(e) => setTriggerConfig((prev) => ({ ...prev, [param.key]: e.target.value }))}
                    placeholder={`${param.label} 입력...`}
                    className="focus-ring mt-1 w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text placeholder:text-app-text-subtle"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-app-text-secondary">액션</label>
              <button
                type="button"
                onClick={addAction}
                className="flex items-center gap-1 rounded-lg bg-app-primary/10 px-2.5 py-1 text-[10px] font-medium text-app-primary hover:bg-app-primary/20 transition-colors"
              >
                <Plus className="h-3 w-3" />
                액션 추가
              </button>
            </div>

            {actions.length === 0 && (
              <p className="text-[11px] text-app-text-muted italic py-2">액션을 추가하세요 (예: 메시지 발송, AI 답변)</p>
            )}

            <AnimatePresence>
              {actions.map((action, i) => {
                const actionType = action.type as string;
                const actionDef = actionDefs.find((a) => a.id === actionType);
                const Icon = actionDef ? getActionIcon(actionType) : Zap;
                return (
                  <motion.div
                    key={(action as any)?.id || `action-${i}`}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-lg border border-app-border bg-app-bg p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-app-primary" />
                        <span className="text-xs font-medium text-app-text">액션 {i + 1}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAction(i)}
                        className="p-1 rounded text-app-text-muted hover:text-app-danger"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <select
                      value={actionType}
                      onChange={(e) => updateAction(i, "type", e.target.value)}
                      className="focus-ring w-full rounded-lg border border-app-border bg-app-card px-3 py-2 text-xs text-app-text"
                    >
                      <option value="">액션 선택</option>
                      {actionDefs.map((a) => (
                        <option key={a.id} value={a.id}>{a.label} — {a.desc}</option>
                      ))}
                    </select>

                    {actionDef && actionDef.params.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {actionDef.params.map((param) => {
                          const config = (action.config as Record<string, unknown>) ?? {};
                          const val = (config[param.key] as string) ?? "";
                          return (
                            <div key={param.key}>
                              <label className="text-[10px] text-app-text-muted">{param.label}</label>
                              {param.type === "textarea" ? (
                                <textarea
                                  value={val}
                                  onChange={(e) => updateAction(i, param.key, e.target.value)}
                                  placeholder={`${param.label} 입력...`}
                                  rows={2}
                                  className="focus-ring mt-0.5 w-full rounded-lg border border-app-border bg-app-card px-2.5 py-1.5 text-xs text-app-text placeholder:text-app-text-subtle resize-none"
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={val}
                                  onChange={(e) => updateAction(i, param.key, e.target.value)}
                                  placeholder={`${param.label} 입력...`}
                                  className="focus-ring mt-0.5 w-full rounded-lg border border-app-border bg-app-card px-2.5 py-1.5 text-xs text-app-text placeholder:text-app-text-subtle"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Active toggle */}
          <label className="flex items-center gap-2 cursor-pointer pb-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-app-border text-app-primary focus:ring-app-primary"
            />
            <span className="text-xs font-medium text-app-text-secondary">규칙 활성화</span>
          </label>
        </div>

        {/* Save */}
        <div className="mt-5 flex gap-2 border-t border-app-border pt-4">
          <button onClick={onClose} className="flex-1 rounded-xl border border-app-border py-2.5 text-sm font-medium text-app-text-secondary hover:bg-app-card-hover transition-colors">
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid || saving}
            className="flex-1 rounded-xl bg-app-primary py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            <div className="flex items-center justify-center gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "저장 중..." : isEditing ? "수정 완료" : "규칙 생성"}
            </div>
          </button>
        </div>

        {!isValid && (
          <p className="mt-2 text-[11px] text-amber-500">규칙 이름과 트리거를 선택해주세요.</p>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Main Tab ───────────────────────────────────────────────────────

export function TriggersTab() {
  const [rules, setRules] = useState<triggerApi.TriggerRule[]>([]);
  const [stats, setStats] = useState<triggerApi.TriggerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<Partial<triggerApi.TriggerRule> | null>(null);
  const [triggerDefs, setTriggerDefs] = useState<triggerApi.TriggerDef[]>([]);
  const [actionDefs, setActionDefs] = useState<triggerApi.ActionDef[]>([]);
  const [saving, setSaving] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, s, t, a] = await Promise.all([
        triggerApi.fetchRules(),
        triggerApi.fetchTriggerStats(),
        triggerApi.fetchTriggerDefs().catch(() => [] as triggerApi.TriggerDef[]),
        triggerApi.fetchActionDefs().catch(() => [] as triggerApi.ActionDef[]),
      ]);
      setRules(r);
      setStats(s);
      setTriggerDefs(t);
      setActionDefs(a);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleToggle(id: string) {
    await triggerApi.toggleRule(id);
    load();
  }

  async function handleDelete(id: string) {
    await triggerApi.deleteRule(id);
    load();
  }

  function handleEdit(rule: triggerApi.TriggerRule) {
    setEditingRule(rule);
    setShowEditor(true);
  }

  function handleCreateNew() {
    setEditingRule(null);
    setShowEditor(true);
  }

  async function handleSave(data: {
    name: string;
    description: string;
    trigger_type: string;
    trigger_config: Record<string, unknown>;
    actions: Record<string, unknown>[];
    is_active: boolean;
  }) {
    setSaving(true);
    try {
      if (editingRule?.id) {
        await triggerApi.updateRule(editingRule.id, data);
      } else {
        await triggerApi.createRule(data);
      }
      setShowEditor(false);
      setEditingRule(null);
      load();
    } catch { /* ignore */ }
    setSaving(false);
  }

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10">
          <Workflow className="h-5 w-5 text-indigo-500" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold text-app-text">자동화 규칙</h2>
          <p className="text-xs text-app-text-muted">트리거 → 액션 워크플로우</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="flex items-center gap-1.5 rounded-lg bg-app-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
        >
          <Plus className="h-3.5 w-3.5" />
          새 규칙
        </button>
        <button onClick={load} className="p-1.5 rounded-lg hover:bg-app-card-hover text-app-text-muted">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="flex gap-2 text-xs">
          <span className="rounded-lg bg-app-card border border-app-border px-2.5 py-1">
            전체 <strong>{stats.total_rules}</strong>
          </span>
          <span className="rounded-lg bg-app-card border border-app-border px-2.5 py-1">
            활성 <strong>{stats.active_rules}</strong>
          </span>
          {stats.total_rules > 0 && (
            <span className="rounded-lg bg-app-card border border-app-border px-2.5 py-1 text-app-text-muted">
              비활성 <strong>{stats.total_rules - stats.active_rules}</strong>
            </span>
          )}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-app-primary" />
        </div>
      ) : rules.length === 0 ? (
        /* Empty state */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center py-16 text-app-text-muted gap-3"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-app-card border border-app-border">
            <Workflow className="h-7 w-7 opacity-30" />
          </div>
          <p className="text-sm font-medium text-app-text-secondary">아직 등록된 규칙이 없습니다</p>
          <p className="text-xs">트리거와 액션을 연결하여 발송/알림을 자동화하세요</p>
          <button
            onClick={handleCreateNew}
            className="mt-2 flex items-center gap-1.5 rounded-lg bg-app-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
          >
            <Plus className="h-3.5 w-3.5" />
            첫 규칙 만들기
          </button>
        </motion.div>
      ) : (
        /* Rule list */
        <div className="space-y-2">
          <AnimatePresence>
            {rules.map((r) => (
              <motion.div
                key={r.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group rounded-xl border border-app-border bg-app-card p-3.5 transition-all hover:border-app-primary/20 hover:shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          r.is_active
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-gray-500/10 text-gray-500"
                        }`}
                      >
                        {r.is_active ? "활성" : "비활성"}
                      </span>
                      <span className="text-sm font-semibold text-app-text truncate">{r.name}</span>
                      <span className="text-[10px] text-app-text-muted bg-app-bg px-1.5 py-0.5 rounded">
                        {r.trigger_type}
                      </span>
                    </div>
                    {r.description && (
                      <p className="text-xs text-app-text-secondary mt-0.5 truncate">{r.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-app-text-subtle">
                        {(r.actions as Record<string, unknown>[])?.length ?? 0}개 액션
                      </span>
                      {r.run_count > 0 && (
                        <span className="text-[10px] text-app-text-subtle">· 실행 {r.run_count}회</span>
                      )}
                      {r.cooldown_seconds > 0 && (
                        <span className="text-[10px] text-app-text-subtle">· 쿨다운 {r.cooldown_seconds}초</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleEdit(r)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-subtle opacity-0 transition-all duration-150 hover:bg-app-card-hover group-hover:opacity-100"
                      title="수정"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggle(r.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-card-hover"
                      title={r.is_active ? "비활성화" : "활성화"}
                    >
                      {r.is_active
                        ? <ToggleRight className="h-4 w-4 text-emerald-500" />
                        : <ToggleLeft className="h-4 w-4" />
                      }
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-500/10"
                      title="삭제"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Rule Editor Modal */}
      <AnimatePresence>
        {showEditor && (
          <RuleEditorModal
            rule={editingRule}
            triggerDefs={triggerDefs}
            actionDefs={actionDefs}
            onSave={handleSave}
            onClose={() => { setShowEditor(false); setEditingRule(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
