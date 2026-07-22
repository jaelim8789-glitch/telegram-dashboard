"use client";

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { MessageSquare } from "lucide-react";

export type MessageNodeData = {
  content?: string;
  recipient?: string;
};

export function MessageNode({ data, selected }: NodeProps<Node<MessageNodeData>>) {
  const d = data as Record<string, unknown>;
  const invalid = d.__invalid;
  const preview = d.__preview;

  return (
    <div
      className={`relative min-w-[160px] rounded-xl border p-3 text-app-text text-xs font-medium transition-all ${
        preview
          ? "border-green-400/70 bg-green-500/20 shadow-lg shadow-green-500/40 animate-pulse"
          : invalid
            ? "border-red-500/60 bg-red-500/10 shadow-lg shadow-red-500/20"
            : selected
              ? "shadow-lg shadow-violet-500/20 [outline:2px_solid_#8B5CF6] border-violet-500/30 bg-violet-500/10"
              : "border-violet-500/30 bg-violet-500/10 hover:shadow-md hover:shadow-purple-500/10"
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
        <p className="mt-1.5 line-clamp-2 text-[11px] font-normal text-app-text-muted">
          {data.content}
        </p>
      )}
      {data.recipient && (
        <span className="mt-1 block text-[10px] font-normal text-app-text-muted">
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
