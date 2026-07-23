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
      className={`relative min-w-[160px] rounded-xl border bg-violet-500/10 p-3 text-app-text text-xs font-medium transition-shadow ${
        selected
          ? "shadow-lg shadow-violet-500/20 [outline:2px_solid_#8B5CF6]"
          : "border-violet-500/30 hover:shadow-md"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-violet-500 !bg-violet-500"
      />
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-violet-400" />
        <span className="font-medium">메시지</span>
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
      <div className="absolute -bottom-[7px] left-1/2 -translate-x-1/2 h-[14px] w-[14px] rotate-45 border-b border-r border-violet-500/30 bg-violet-500/10" />
    </div>
  );
}
