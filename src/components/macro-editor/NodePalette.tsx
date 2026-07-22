"use client";

import { Play, GitBranch, MessageSquare, Clock, Sparkles, Type, GripVertical } from "lucide-react";
import type { DragEvent } from "react";

const nodeTypes = [
  {
    type: "start",
    label: "시작",
    description: "매크로 시작 지점",
    icon: Play,
    color: "green",
  },
  {
    type: "condition",
    label: "조건",
    description: "조건에 따라 분기",
    icon: GitBranch,
    color: "amber",
    diamond: true,
  },
  {
    type: "message",
    label: "메시지",
    description: "메시지 전송",
    icon: MessageSquare,
    color: "violet",
  },
  {
    type: "delay",
    label: "지연",
    description: "시간 지연",
    icon: Clock,
    color: "blue",
  },
  {
    type: "ai-response",
    label: "AI 응답",
    description: "AI 응답 생성",
    icon: Sparkles,
    color: "purple",
  },
  {
    type: "text",
    label: "텍스트",
    description: "텍스트 출력",
    icon: Type,
    color: "gray",
  },
] as const;

const colorMap: Record<string, { border: string; bg: string; text: string; icon: string }> = {
  green: { border: "border-green-500/40", bg: "bg-green-500/10 hover:bg-green-500/20", text: "text-green-400", icon: "text-green-400" },
  amber: { border: "border-amber-500/40", bg: "bg-amber-500/10 hover:bg-amber-500/20", text: "text-amber-400", icon: "text-amber-400" },
  violet: { border: "border-violet-500/40", bg: "bg-violet-500/10 hover:bg-violet-500/20", text: "text-violet-400", icon: "text-violet-400" },
  blue: { border: "border-blue-500/40", bg: "bg-blue-500/10 hover:bg-blue-500/20", text: "text-blue-400", icon: "text-blue-400" },
  purple: { border: "border-purple-500/40", bg: "bg-purple-500/10 hover:bg-purple-500/20", text: "text-purple-400", icon: "text-purple-400" },
  gray: { border: "border-gray-500/40", bg: "bg-gray-500/10 hover:bg-gray-500/20", text: "text-gray-400", icon: "text-gray-400" },
};

export function NodePalette() {
  const onDragStart = (event: DragEvent<HTMLDivElement>, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="flex h-full flex-col border-r border-violet-500/20 bg-app-surface">
      <div className="border-b border-violet-500/20 px-4 py-3">
        <h2 className="text-sm font-semibold text-app-text">노드 팔레트</h2>
        <p className="text-[11px] text-app-text-muted">드래그하여 캔버스에 추가</p>
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
              className={`cursor-grab rounded-xl border p-3 transition-colors active:cursor-grabbing ${c.border} ${c.bg}`}
            >
              <div className="flex items-start gap-2">
                <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-app-text-muted" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Icon className={`h-4 w-4 ${c.icon}`} />
                    <span className={`text-xs font-semibold ${c.text}`}>{node.label}</span>
                    {node.diamond && (
                      <span className="ml-auto text-[9px] text-app-text-muted">◇</span>
                    )}
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
