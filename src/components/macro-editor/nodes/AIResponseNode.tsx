"use client";

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Sparkles } from "lucide-react";

export type AIResponseNodeData = {
  prompt?: string;
  model?: string;
};

export function AIResponseNode({ data, selected }: NodeProps<Node<AIResponseNodeData>>) {
  return (
    <div
      className={`min-w-[180px] max-w-[220px] rounded-2xl border-2 p-3 transition-shadow ${
        selected
          ? "border-purple-400 bg-purple-500/30 shadow-lg shadow-purple-500/30"
          : "border-purple-500 bg-purple-500/20"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-purple-500 !bg-purple-500"
      />
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-purple-400" />
        <span className="text-xs font-semibold text-purple-300">AI 응답</span>
      </div>
      {data.prompt && (
        <p className="mt-1.5 line-clamp-2 text-[11px] text-app-text-secondary">
          {data.prompt}
        </p>
      )}
      {data.model && (
        <span className="mt-1 block text-[10px] text-app-text-muted">
          모델: {data.model}
        </span>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !border-2 !border-purple-500 !bg-purple-500"
      />
    </div>
  );
}
