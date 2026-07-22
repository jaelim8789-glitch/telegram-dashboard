"use client";

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Clock } from "lucide-react";

export type DelayNodeData = {
  delayMinutes?: number;
  delayHours?: number;
};

export function DelayNode({ data, selected }: NodeProps<Node<DelayNodeData>>) {
  const d = data as Record<string, unknown>;
  const invalid = d.__invalid;
  const preview = d.__preview;
  const totalMinutes = (data.delayHours ?? 0) * 60 + (data.delayMinutes ?? 0);
  const label = totalMinutes > 0
    ? totalMinutes >= 60
      ? `${Math.floor(totalMinutes / 60)}시간 ${totalMinutes % 60 > 0 ? `${totalMinutes % 60}분` : ""}`
      : `${totalMinutes}분`
    : "지연";

  return (
    <div
      className={`min-w-[160px] rounded-xl border p-3 text-app-text text-xs font-medium transition-shadow ${
        preview
          ? "border-green-400/70 bg-green-500/20 shadow-lg shadow-green-500/40 animate-pulse"
          : invalid
            ? "border-red-500/60 bg-red-500/10 shadow-lg shadow-red-500/20"
            : selected
              ? "shadow-lg shadow-violet-500/20 [outline:2px_solid_#8B5CF6] border-blue-500/30 bg-blue-500/10"
              : "border-blue-500/30 bg-blue-500/10 hover:shadow-md"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-blue-500 !bg-blue-500"
      />
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-blue-400" />
        <span className="font-medium">{label}</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !border-2 !border-blue-500 !bg-blue-500"
      />
    </div>
  );
}
