"use client";

import { Play, GitBranch, MessageSquare, Clock, Sparkles, Type, GripVertical, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { DragEvent } from "react";

const nodeTypes = [
  { type: "start", label: "시작", description: "매크로 시작 지점", icon: Play, color: "green" },
  { type: "condition", label: "조건", description: "분기 조건", icon: GitBranch, color: "amber" },
  { type: "message", label: "메시지", description: "메시지 전송", icon: MessageSquare, color: "violet" },
  { type: "delay", label: "지연", description: "대기 시간", icon: Clock, color: "blue" },
  { type: "ai-response", label: "AI 응답", description: "AI 생성", icon: Sparkles, color: "purple" },
  { type: "text", label: "텍스트", description: "텍스트 출력", icon: Type, color: "gray" },
] as const;

const colorMap: Record<string, { border: string; text: string; icon: string }> = {
  green: { border: "border-green-500/40", text: "text-green-400", icon: "text-green-400" },
  amber: { border: "border-amber-500/40", text: "text-amber-400", icon: "text-amber-400" },
  violet: { border: "border-violet-500/40", text: "text-violet-400", icon: "text-violet-400" },
  blue: { border: "border-blue-500/40", text: "text-blue-400", icon: "text-blue-400" },
  purple: { border: "border-purple-500/40", text: "text-purple-400", icon: "text-purple-400" },
  gray: { border: "border-gray-500/40", text: "text-gray-400", icon: "text-gray-400" },
};

interface NodePaletteProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function NodePalette({ collapsed, onToggle }: NodePaletteProps) {
  const onDragStart = (event: DragEvent<HTMLDivElement>, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  if (collapsed) return null;

  return (
    <div className="flex h-full flex-col border-r border-violet-500/20 bg-app-surface">
      <div className="flex items-center justify-between border-b border-violet-500/20 px-4 py-3">
        <h2 className="text-sm font-semibold text-app-text">노드</h2>
        <button onClick={onToggle} className="rounded p-0.5 text-app-text-muted hover:text-app-text" title="패널 닫기">
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {nodeTypes.map((node) => {
          const c = colorMap[node.color];
          const Icon = node.icon;
          return (
            <div
              key={node.type}
              draggable
              onDragStart={(e) => onDragStart(e, node.type)}
              className={`cursor-grab rounded-xl border bg-app-card p-3 transition-colors active:cursor-grabbing hover:border-violet-500/50 ${c.border}`}
            >
              <div className="flex items-start gap-2">
                <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-app-text-muted" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Icon className={`h-4 w-4 ${c.icon}`} />
                    <span className="text-xs font-medium text-app-text">{node.label}</span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-app-text-muted">{node.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
