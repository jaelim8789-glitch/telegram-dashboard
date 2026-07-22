"use client";

import { useState, useCallback, useMemo } from "react";
import type { Node } from "@xyflow/react";
import {
  Play, GitBranch, MessageSquare, Clock, Sparkles, Type, Trash2, X,
} from "lucide-react";

type MacroNode = Node;

interface PropertiesPanelProps {
  selectedNode: MacroNode | null;
  onUpdateNode: (id: string, data: Record<string, unknown>) => void;
  onDeleteNode: (id: string) => void;
  onDeselect: () => void;
}

const nodeMeta: Record<string, { icon: typeof Play; label: string; color: string }> = {
  start: { icon: Play, label: "시작", color: "green" },
  condition: { icon: GitBranch, label: "조건", color: "amber" },
  message: { icon: MessageSquare, label: "메시지", color: "violet" },
  delay: { icon: Clock, label: "지연", color: "blue" },
  "ai-response": { icon: Sparkles, label: "AI 응답", color: "purple" },
  text: { icon: Type, label: "텍스트", color: "gray" },
};

export function PropertiesPanel({ selectedNode, onUpdateNode, onDeleteNode, onDeselect }: PropertiesPanelProps) {
  const [saved, setSaved] = useState(false);

  const meta = selectedNode?.type ? nodeMeta[selectedNode.type] : null;
  const Icon = meta?.icon;

  const handleChange = useCallback(
    (field: string, value: unknown) => {
      if (!selectedNode) return;
      onUpdateNode(selectedNode.id, { [field]: value });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    },
    [selectedNode, onUpdateNode]
  );

  const data = useMemo(() => (selectedNode?.data ?? {}) as Record<string, unknown>, [selectedNode?.data]);

  if (!selectedNode || !meta) {
    return (
      <div className="flex h-full flex-col border-l border-violet-500/20 bg-app-surface">
        <div className="flex flex-1 items-center justify-center px-4">
          <p className="text-center text-sm text-app-text-muted">
            노드를 선택하면<br />속성을 편집할 수 있습니다
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col border-l border-violet-500/20 bg-app-surface">
      <div className="flex items-center justify-between border-b border-violet-500/20 px-4 py-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-app-text-secondary" />}
          <span className="text-sm font-semibold text-app-text">{meta.label}</span>
        </div>
        <button
          onClick={onDeselect}
          className="rounded-lg p-1 text-app-text-muted hover:bg-app-card-hover hover:text-app-text"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {selectedNode.type === "message" && (
          <>
            <label className="block">
              <span className="text-xs font-medium text-app-text-secondary">메시지 내용</span>
              <textarea
                value={(data.content as string) ?? ""}
                onChange={(e) => handleChange("content", e.target.value)}
                placeholder="전송할 메시지를 입력하세요"
                rows={4}
                className="mt-1 w-full resize-none rounded-xl border border-violet-500/20 bg-app-bg px-3 py-2 text-xs text-app-text placeholder:text-app-text-muted focus:border-violet-500/50 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-app-text-secondary">수신 대상</span>
              <select
                value={(data.recipient as string) ?? ""}
                onChange={(e) => handleChange("recipient", e.target.value)}
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
              <span className="text-xs font-medium text-app-text-secondary">시간</span>
              <input
                type="number"
                min={0}
                value={(data.delayHours as number) ?? 0}
                onChange={(e) => handleChange("delayHours", parseInt(e.target.value, 10) || 0)}
                className="mt-1 w-full rounded-xl border border-violet-500/20 bg-app-bg px-3 py-2 text-xs text-app-text focus:border-violet-500/50 focus:outline-none"
              />
              <span className="text-[10px] text-app-text-muted">시간</span>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-app-text-secondary">분</span>
              <input
                type="number"
                min={0}
                max={59}
                value={(data.delayMinutes as number) ?? 0}
                onChange={(e) => handleChange("delayMinutes", parseInt(e.target.value, 10) || 0)}
                className="mt-1 w-full rounded-xl border border-violet-500/20 bg-app-bg px-3 py-2 text-xs text-app-text focus:border-violet-500/50 focus:outline-none"
              />
              <span className="text-[10px] text-app-text-muted">분</span>
            </label>
          </>
        )}

        {selectedNode.type === "condition" && (
          <>
            <label className="block">
              <span className="text-xs font-medium text-app-text-secondary">조건 유형</span>
              <select
                value={(data.conditionType as string) ?? ""}
                onChange={(e) => handleChange("conditionType", e.target.value)}
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
              <span className="text-xs font-medium text-app-text-secondary">조건 값</span>
              <input
                type="text"
                value={(data.conditionValue as string) ?? ""}
                onChange={(e) => handleChange("conditionValue", e.target.value)}
                placeholder="조건 값을 입력하세요"
                className="mt-1 w-full rounded-xl border border-violet-500/20 bg-app-bg px-3 py-2 text-xs text-app-text placeholder:text-app-text-muted focus:border-violet-500/50 focus:outline-none"
              />
            </label>
          </>
        )}

        {selectedNode.type === "ai-response" && (
          <>
            <label className="block">
              <span className="text-xs font-medium text-app-text-secondary">프롬프트</span>
              <textarea
                value={(data.prompt as string) ?? ""}
                onChange={(e) => handleChange("prompt", e.target.value)}
                placeholder="AI에게 지시할 프롬프트를 입력하세요"
                rows={4}
                className="mt-1 w-full resize-none rounded-xl border border-violet-500/20 bg-app-bg px-3 py-2 text-xs text-app-text placeholder:text-app-text-muted focus:border-violet-500/50 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-app-text-secondary">모델</span>
              <select
                value={(data.model as string) ?? ""}
                onChange={(e) => handleChange("model", e.target.value)}
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
            <span className="text-xs font-medium text-app-text-secondary">텍스트 내용</span>
            <textarea
              value={(data.content as string) ?? ""}
              onChange={(e) => handleChange("content", e.target.value)}
              placeholder="출력할 텍스트를 입력하세요"
              rows={4}
              className="mt-1 w-full resize-none rounded-xl border border-violet-500/20 bg-app-bg px-3 py-2 text-xs text-app-text placeholder:text-app-text-muted focus:border-violet-500/50 focus:outline-none"
            />
          </label>
        )}

        {selectedNode.type === "start" && (
          <p className="text-xs text-app-text-muted">시작 노드는 설정이 필요하지 않습니다.</p>
        )}
      </div>

      <div className="border-t border-violet-500/20 px-4 py-3 space-y-2">
        {saved && (
          <p className="text-center text-[10px] text-green-400">자동 저장됨</p>
        )}
        <button
          onClick={() => onDeleteNode(selectedNode.id)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400 transition-colors hover:bg-red-500/20"
        >
          <Trash2 className="h-3.5 w-3.5" />
          노드 삭제
        </button>
      </div>
    </div>
  );
}
