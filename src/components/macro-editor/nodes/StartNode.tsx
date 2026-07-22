"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Play } from "lucide-react";

export type StartNodeData = Record<string, never>;

export function StartNode({ selected }: NodeProps) {
  return (
    <div
      className={`flex h-16 w-16 items-center justify-center rounded-full border-2 bg-green-500/20 transition-shadow ${
        selected
          ? "border-green-400 shadow-lg shadow-green-500/30"
          : "border-green-500"
      }`}
    >
      <Play className="h-6 w-6 text-green-400" fill="currentColor" />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !border-2 !border-green-500 !bg-green-500"
      />
    </div>
  );
}
