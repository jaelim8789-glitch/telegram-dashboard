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
        className={`flex h-[90px] w-[90px] rotate-45 items-center justify-center border transition-shadow ${
          selected
            ? "shadow-lg shadow-violet-500/20 [outline:2px_solid_#8B5CF6] outline-offset-[3px]"
            : "border-amber-500/30"
        } bg-amber-500/10`}
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
        position={Position.Right}
        id="true"
        className="!h-3 !w-3 !border-2 !border-green-500 !bg-green-500"
        style={{ right: 22 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="!h-3 !w-3 !border-2 !border-red-500 !bg-red-500"
        style={{ bottom: -8 }}
      />
      {data.conditionType && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-app-text-muted">
          {data.conditionType}
        </div>
      )}
    </div>
  );
}
