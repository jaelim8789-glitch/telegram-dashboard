"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Play } from "lucide-react";

export type StartNodeData = Record<string, never>;

export function StartNode({ data, selected }: NodeProps) {
  const d = data as Record<string, unknown>;
  const invalid = d.__invalid;
  const preview = d.__preview;

  const base = "min-w-[160px] rounded-full border p-3 text-app-text text-xs font-medium";
  const invalidCls = "border-red-500/60 bg-red-500/10 shadow-lg shadow-red-500/20";
  const previewCls = "border-green-400/70 bg-green-500/20 shadow-lg shadow-green-500/40 animate-pulse";
  const selectedCls = "shadow-lg shadow-violet-500/20 [outline:2px_solid_#22c55e] border-green-500/30";
  const normalCls = "border-green-500/30 bg-green-500/10 hover:shadow-md hover:shadow-purple-500/10";

  return (
    <div className={`${base} ${preview ? previewCls : invalid ? invalidCls : selected ? selectedCls : normalCls}`}>
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
