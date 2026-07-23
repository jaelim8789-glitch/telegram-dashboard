"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Play } from "lucide-react";

export type StartNodeData = Record<string, never>;

export function StartNode({ selected }: NodeProps) {
  return (
    <div
      className={`min-w-[160px] rounded-full border bg-green-500/10 p-3 text-app-text text-xs font-medium ${
        selected
          ? "shadow-lg shadow-violet-500/20 [outline:2px_solid_#22c55e]"
          : "border-green-500/30"
      }`}
    >
      <div className="flex items-center justify-center gap-2">
        <Play className="h-4 w-4 text-green-400" fill="currentColor" />
        <span>시작</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !border-2 !border-green-500 !bg-green-500"
      />
    </div>
  );
}
