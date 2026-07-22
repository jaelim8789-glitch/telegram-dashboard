"use client";

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { MessageSquare } from "lucide-react";

export type MessageNodeData = {
  content?: string;
  recipient?: string;
};

export function MessageNode({ data, selected }: NodeProps<Node<MessageNodeData>>) {
  return (
    <div
      className={`min-w-[180px] max-w-[220px] rounded-2xl border-2 p-3 transition-shadow ${
        selected
          ? "border-violet-400 bg-violet-500/30 shadow-lg shadow-violet-500/30"
          : "border-violet-500 bg-violet-500/20"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-violet-500 !bg-violet-500"
      />
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-violet-400" />
        <span className="text-xs font-semibold text-violet-300">메시지</span>
      </div>
      {data.content && (
        <p className="mt-1.5 line-clamp-2 text-[11px] text-app-text-secondary">
          {data.content}
        </p>
      )}
      {data.recipient && (
        <span className="mt-1 block text-[10px] text-app-text-muted">
          수신: {data.recipient}
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
