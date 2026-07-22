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
      className={`min-w-[160px] rounded-xl border p-3 text-app-text text-xs font-medium transition-shadow bg-gradient-to-br from-violet-500/10 to-blue-500/10 ${
        selected
          ? "shadow-lg shadow-violet-500/20 border-violet-500/60 [outline:2px_solid_#8B5CF6]"
          : "border-violet-500/30 hover:shadow-md"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-violet-500 !bg-violet-500"
      />
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet-400" />
        <span className="font-medium">AI 응답</span>
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
        className="!h-3 !w-3 !border-2 !border-violet-500 !bg-violet-500"
      />
    </div>
  );
}
