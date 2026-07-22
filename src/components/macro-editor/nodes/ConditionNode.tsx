"use client";

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { GitBranch } from "lucide-react";

export type ConditionNodeData = {
  conditionType?: string;
  conditionValue?: string;
};

export function ConditionNode({ data, selected }: NodeProps<Node<ConditionNodeData>>) {
  return (
    <div className="relative flex items-center justify-center">
      <div
        className={`flex h-20 w-20 rotate-45 items-center justify-center border-2 transition-shadow ${
          selected
            ? "border-amber-400 bg-amber-500/30 shadow-lg shadow-amber-500/30"
            : "border-amber-500 bg-amber-500/20"
        }`}
      >
        <div className="-rotate-45 flex flex-col items-center gap-0.5">
          <GitBranch className="h-5 w-5 text-amber-400" />
          <span className="text-[10px] font-semibold text-amber-300">조건</span>
        </div>
      </div>
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-amber-500 !bg-amber-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="!h-3 !w-3 !border-2 !border-green-500 !bg-green-500"
        style={{ right: "25%" }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="!h-3 !w-3 !border-2 !border-red-500 !bg-red-500"
        style={{ left: "25%" }}
      />
      {data.conditionType && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-app-text-muted">
          {data.conditionType}
        </div>
      )}
    </div>
  );
}
