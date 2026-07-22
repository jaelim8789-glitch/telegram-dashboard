"use client";

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Clock } from "lucide-react";

export type DelayNodeData = {
  delayMinutes?: number;
  delayHours?: number;
};

export function DelayNode({ data, selected }: NodeProps<Node<DelayNodeData>>) {
  const totalMinutes = (data.delayHours ?? 0) * 60 + (data.delayMinutes ?? 0);
  const label = totalMinutes > 0
    ? totalMinutes >= 60
      ? `${Math.floor(totalMinutes / 60)}시간 ${totalMinutes % 60 > 0 ? `${totalMinutes % 60}분` : ""}`
      : `${totalMinutes}분`
    : "지연";

  return (
    <div
      className={`min-w-[140px] rounded-2xl border-2 p-3 transition-shadow ${
        selected
          ? "border-blue-400 bg-blue-500/30 shadow-lg shadow-blue-500/30"
          : "border-blue-500 bg-blue-500/20"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-blue-500 !bg-blue-500"
      />
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-blue-400" />
        <span className="text-xs font-semibold text-blue-300">{label}</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !border-2 !border-blue-500 !bg-blue-500"
      />
    </div>
  );
}
