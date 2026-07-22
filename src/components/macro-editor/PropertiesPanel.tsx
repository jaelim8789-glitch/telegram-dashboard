"use client";

import { useState, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Node } from "@xyflow/react";
import {
  Play, GitBranch, MessageSquare, Clock, Sparkles, Type, Trash2, X, ChevronDown, Minus, PanelRightClose, MousePointerClick,
} from "lucide-react";

type MacroNode = Node;

interface PropertiesPanelProps {
  selectedNode: MacroNode | null;
  selectedEdgeId: string | null;
  onUpdateNode: (id: string, data: Record<string, unknown>) => void;
  onUpdateNodeDone: (id: string, data: Record<string, unknown>) => void;
  onDeleteNode: (id: string) => void;
  onDeleteEdge: (id: string) => void;
  onDeselect: () => void;
  collapsed: boolean;
  onToggle: () => void;
}

const nodeMeta: Record<string, { icon: typeof Play; label: string; color: string }> = {
  start: { icon: Play, label: "시작", color: "green" },
  condition: { icon: GitBranch, label: "조건", color: "amber" },
  message: { icon: MessageSquare, label: "메시지", color: "violet" },
  delay: { icon: Clock, label: "지연", color: "blue" },
  "ai-response": { icon: Sparkles, label: "AI 응답", color: "purple" },
  text: { icon: Type, label: "텍스트", color: "gray" },
};

export function PropertiesPanel({
  selectedNode, selectedEdgeId, onUpdateNode, onUpdateNodeDone, onDeleteNode, onDeleteEdge, onDeselect, collapsed, onToggle,
}: PropertiesPanelProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const meta = selectedNode?.type ? nodeMeta[selectedNode.type] : null;
  const Icon = meta?.icon;

  const handleChange = useCallback((field: string, value: unknown) => {
    if (!selectedNode) return;
    onUpdateNode(selectedNode.id, { [field]: value });
  }, [selectedNode, onUpdateNode]);

  const handleDone = useCallback((field: string, value: unknown) => {
    if (!selectedNode) return;
    onUpdateNodeDone(selectedNode.id, { [field]: value });
  }, [selectedNode, onUpdateNodeDone]);

  const data = useMemo(() => (selectedNode?.data ?? {}) as Record<string, unknown>, [selectedNode?.data]);

  const hasSelection = !!selectedNode || !!selectedEdgeId;

  if (collapsed) return null;

  return (
    <div className="flex h-full flex-col border-l border-violet-500/20 bg-app-surface">
      <AnimatePresence mode="wait">
        {!hasSelection ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex flex-1 flex-col"
          >
            <div className="flex items-center justify-end border-b border-violet-500/20 px-4 py-3">
              <button onClick={onToggle} className="rounded p-0.5 text-app-text-muted hover:text-app-text hover:scale-[1.02] active:scale-[0.98] transition-transform" title="패널 닫기">
                <PanelRightClose className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-app-card-hover">
                <MousePointerClick className="h-6 w-6 text-app-text-muted" />
              </div>
              <p className="text-center text-sm font-medium text-app-text-secondary">노드를 선택하면<br />속성을 편집할 수 있습니다</p>
              <div className="space-y-1.5 text-center">
                <p className="text-[11px] font-normal text-app-text-muted"><kbd className="rounded bg-app-border px-1.5 py-0.5 font-mono text-[10px]">Delete</kbd> 선택 삭제</p>
                <p className="text-[11px] font-normal text-app-text-muted"><kbd className="rounded bg-app-border px-1.5 py-0.5 font-mono text-[10px]">⌘D</kbd> 노드 복제</p>
                <p className="text-[11px] font-normal text-app-text-muted"><kbd className="rounded bg-app-border px-1.5 py-0.5 font-mono text-[10px]">⌘Z</kbd> 실행 취소</p>
                <p className="text-[11px] font-normal text-app-text-muted"><kbd className="rounded bg-app-border px-1.5 py-0.5 font-mono text-[10px]">⌘⇧Z</kbd> 다시 실행</p>
              </div>
            </div>
          </motion.div>
        ) : selectedEdgeId && !selectedNode ? (
          <motion.div
            key="edge-panel"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-violet-500/20 px-4 py-3">
              <div className="flex items-center gap-2">
                <Minus className="h-5 w-5 text-violet-400" />
                <span className="text-sm font-bold tracking-tight text-app-text">연결선</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={onDeselect} className="rounded-lg p-1 text-app-text-muted hover:bg-app-card-hover hover:text-app-text hover:scale-[1.02] active:scale-[0.98] transition-transform">
                  <X className="h-4 w-4" />
                </button>
                <button onClick={onToggle} className="rounded-lg p-1 text-app-text-muted hover:text-app-text hover:scale-[1.02] active:scale-[0.98] transition-transform" title="패널 닫기">
                  <PanelRightClose className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 p-4">
              <p className="text-xs font-medium text-app-text-secondary">선택한 연결선을 삭제하려면 <kbd className="rounded bg-app-border px-1.5 py-0.5 font-mono text-[11px]">Delete</kbd> 키를 누르세요.</p>
            </div>
            <div className="border-t border-violet-500/20 px-4 py-3">
              <button
                onClick={() => { onDeleteEdge(selectedEdgeId); onDeselect(); }}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 transition-all hover:bg-red-500/20 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Trash2 className="h-3.5 w-3.5" />연결선 삭제
              </button>
            </div>
          </motion.div>
        ) : selectedNode && meta ? (
          <motion.div
            key={selectedNode.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-violet-500/20 px-4 py-3">
              <div className="flex items-center gap-2">
                {Icon && <Icon className="h-5 w-5 text-app-text-secondary" />}
                <span className="text-sm font-bold tracking-tight text-app-text">{meta.label}</span>
                {(data as any).__invalid && <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-medium text-red-400">필수 입력</span>}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={onDeselect} className="rounded-lg p-1 text-app-text-muted hover:bg-app-card-hover hover:text-app-text hover:scale-[1.02] active:scale-[0.98] transition-transform">
                  <X className="h-4 w-4" />
                </button>
                <button onClick={onToggle} className="rounded-lg p-1 text-app-text-muted hover:text-app-text hover:scale-[1.02] active:scale-[0.98] transition-transform" title="패널 닫기">
                  <PanelRightClose className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {selectedNode.type === "message" && (
                <>
                  <label className="block">
                    <span className="text-xs font-medium text-app-text-secondary">메시지 내용 <span className="text-red-400">*</span></span>
                    <textarea
                      value={(data.content as string) ?? ""}
                      onChange={(e) => handleChange("content", e.target.value)}
                      onBlur={(e) => handleDone("content", e.target.value)}
                      placeholder="전송할 메시지를 입력하세요"
                      rows={4}
                      className="mt-1 w-full resize-none rounded-xl border border-violet-500/20 bg-app-bg px-3 py-2 text-xs text-app-text placeholder:text-app-text-muted focus:border-violet-500/50 focus:outline-none"
                    />
                    <p className="mt-1 text-[11px] font-normal text-app-text-muted">템플릿 변수 사용 가능: {"{{name}} {{date}}"}</p>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-app-text-secondary">수신 대상</span>
                    <select
                      value={(data.recipient as string) ?? ""}
                      onChange={(e) => { handleChange("recipient", e.target.value); handleDone("recipient", e.target.value); }}
                      className="mt-1 w-full rounded-xl border border-violet-500/20 bg-app-bg px-3 py-2 text-xs text-app-text focus:border-violet-500/50 focus:outline-none"
                    >
                      <option value="">선택하세요</option>
                      <option value="group">그룹</option>
                      <option value="dm">개인 메시지</option>
                      <option value="broadcast">전체 발송</option>
                    </select>
                  </label>
                </>
              )}

              {selectedNode.type === "delay" && (
                <>
                  <label className="block">
                    <span className="text-xs font-medium text-app-text-secondary">시간 <span className="text-red-400">*</span></span>
                    <input
                      type="number" min={0}
                      value={(data.delayValue as number) ?? 0}
                      onChange={(e) => handleChange("delayValue", parseInt(e.target.value, 10) || 0)}
                      onBlur={(e) => handleDone("delayValue", parseInt(e.target.value, 10) || 0)}
                      className="mt-1 w-full rounded-xl border border-violet-500/20 bg-app-bg px-3 py-2 text-xs text-app-text focus:border-violet-500/50 focus:outline-none"
                    />
                    <p className="mt-1 text-[11px] font-normal text-app-text-muted">1 이상의 값을 입력하세요</p>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-app-text-secondary">단위</span>
                    <select
                      value={(data.delayUnit as string) ?? "minutes"}
                      onChange={(e) => { handleChange("delayUnit", e.target.value); handleDone("delayUnit", e.target.value); }}
                      className="mt-1 w-full rounded-xl border border-violet-500/20 bg-app-bg px-3 py-2 text-xs text-app-text focus:border-violet-500/50 focus:outline-none"
                    >
                      <option value="minutes">분</option>
                      <option value="hours">시간</option>
                    </select>
                  </label>
                </>
              )}

              {selectedNode.type === "condition" && (
                <>
                  <label className="block">
                    <span className="text-xs font-medium text-app-text-secondary">조건 유형 <span className="text-red-400">*</span></span>
                    <select
                      value={(data.conditionType as string) ?? ""}
                      onChange={(e) => { handleChange("conditionType", e.target.value); handleDone("conditionType", e.target.value); }}
                      className="mt-1 w-full rounded-xl border border-violet-500/20 bg-app-bg px-3 py-2 text-xs text-app-text focus:border-violet-500/50 focus:outline-none"
                    >
                      <option value="">선택하세요</option>
                      <option value="keyword">키워드 포함</option>
                      <option value="sender">특정 발신자</option>
                      <option value="time">시간 조건</option>
                      <option value="member_count">멤버 수</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-app-text-secondary">조건 값 <span className="text-red-400">*</span></span>
                    <input
                      type="text"
                      value={(data.conditionValue as string) ?? ""}
                      onChange={(e) => handleChange("conditionValue", e.target.value)}
                      onBlur={(e) => handleDone("conditionValue", e.target.value)}
                      placeholder="조건 값을 입력하세요"
                      className="mt-1 w-full rounded-xl border border-violet-500/20 bg-app-bg px-3 py-2 text-xs text-app-text placeholder:text-app-text-muted focus:border-violet-500/50 focus:outline-none"
                    />
                    <p className="mt-1 text-[11px] font-normal text-app-text-muted">예) 안녕, 주문, /start</p>
                  </label>
                </>
              )}

              {selectedNode.type === "ai-response" && (
                <>
                  <label className="block">
                    <span className="text-xs font-medium text-app-text-secondary">프롬프트 <span className="text-red-400">*</span></span>
                    <textarea
                      value={(data.prompt as string) ?? ""}
                      onChange={(e) => handleChange("prompt", e.target.value)}
                      onBlur={(e) => handleDone("prompt", e.target.value)}
                      placeholder="AI에게 지시할 프롬프트를 입력하세요"
                      rows={4}
                      className="mt-1 w-full resize-none rounded-xl border border-violet-500/20 bg-app-bg px-3 py-2 text-xs text-app-text placeholder:text-app-text-muted focus:border-violet-500/50 focus:outline-none"
                    />
                    <p className="mt-1 text-[11px] font-normal text-app-text-muted">예) 사용자 메시지에 친절하게 답변해줘</p>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-app-text-secondary">모델</span>
                    <select
                      value={(data.model as string) ?? ""}
                      onChange={(e) => { handleChange("model", e.target.value); handleDone("model", e.target.value); }}
                      className="mt-1 w-full rounded-xl border border-violet-500/20 bg-app-bg px-3 py-2 text-xs text-app-text focus:border-violet-500/50 focus:outline-none"
                    >
                      <option value="">선택하세요</option>
                      <option value="gpt-4o">GPT-4o</option>
                      <option value="gpt-4o-mini">GPT-4o Mini</option>
                      <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                      <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                    </select>
                  </label>
                </>
              )}

              {selectedNode.type === "text" && (
                <label className="block">
                  <span className="text-xs font-medium text-app-text-secondary">텍스트 내용 <span className="text-red-400">*</span></span>
                  <textarea
                    value={(data.content as string) ?? ""}
                    onChange={(e) => handleChange("content", e.target.value)}
                    onBlur={(e) => handleDone("content", e.target.value)}
                    placeholder="출력할 텍스트를 입력하세요"
                    rows={4}
                    className="mt-1 w-full resize-none rounded-xl border border-violet-500/20 bg-app-bg px-3 py-2 text-xs text-app-text placeholder:text-app-text-muted focus:border-violet-500/50 focus:outline-none"
                  />
                    <p className="mt-1 text-[11px] font-normal text-app-text-muted">템플릿 변수 사용 가능: {"{{name}} {{date}}"}</p>
                </label>
              )}

              {selectedNode.type === "start" && (
                <p className="text-xs font-normal text-app-text-muted">시작 노드는 설정이 필요하지 않습니다.</p>
              )}

              <div className="border-t border-violet-500/20 pt-4">
                <button
                  onClick={() => setAdvancedOpen(!advancedOpen)}
                  className="flex w-full items-center justify-between text-xs font-medium text-app-text-secondary hover:text-app-text transition-colors"
                >
                  고급 설정
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
                </button>
                {advancedOpen && (
                  <div className="mt-3 space-y-3">
                    <label className="block">
                      <span className="text-[11px] font-normal text-app-text-muted">레이블</span>
                      <input type="text" value={(data.label as string) ?? ""}
                        onChange={(e) => handleChange("label", e.target.value)}
                        onBlur={(e) => handleDone("label", e.target.value)}
                        placeholder="노드 레이블"
                        className="mt-1 w-full rounded-xl border border-violet-500/20 bg-app-bg px-3 py-2 text-xs text-app-text placeholder:text-app-text-muted focus:border-violet-500/50 focus:outline-none"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-normal text-app-text-muted">설명</span>
                      <input type="text" value={(data.description as string) ?? ""}
                        onChange={(e) => handleChange("description", e.target.value)}
                        onBlur={(e) => handleDone("description", e.target.value)}
                        placeholder="노드 설명"
                        className="mt-1 w-full rounded-xl border border-violet-500/20 bg-app-bg px-3 py-2 text-xs text-app-text placeholder:text-app-text-muted focus:border-violet-500/50 focus:outline-none"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-violet-500/20 px-4 py-3 space-y-2">
              <p className="text-center text-[11px] font-normal text-app-text-muted">
                <kbd className="rounded bg-app-border px-1.5 py-0.5 font-mono text-[10px]">⌘D</kbd> 복제 · <kbd className="rounded bg-app-border px-1.5 py-0.5 font-mono text-[10px]">Delete</kbd> 삭제
              </p>
              <button
                onClick={() => onDeleteNode(selectedNode.id)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 transition-all hover:bg-red-500/20 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Trash2 className="h-3.5 w-3.5" />노드 삭제
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
