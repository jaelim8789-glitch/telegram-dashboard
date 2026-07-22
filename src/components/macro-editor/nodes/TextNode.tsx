"use client";

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Type } from "lucide-react";

export type TextNodeData = {
  content?: string;
};

export function TextNode({ data, selected }: NodeProps<Node<TextNodeData>>) {
  const d = data as Record<string, unknown>;
  const invalid = d.__invalid;
  const preview = d.__preview;

  return (
    <div
      className={`min-w-[160px] rounded-xl border p-3 text-app-text text-xs font-medium transition-shadow ${
        preview
          ? "border-green-400/70 bg-green-500/20 shadow-lg shadow-green-500/40 animate-pulse"
          : invalid
            ? "border-red-500/60 bg-red-500/10 shadow-lg shadow-red-500/20"
            : selected
              ? "shadow-lg shadow-violet-500/20 [outline:2px_solid_#8B5CF6] border-gray-500/30 bg-gray-500/10"
              : "border-gray-500/30 bg-gray-500/10 hover:shadow-md"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-gray-500 !bg-gray-500"
      />
      <div className="flex items-center gap-2">
        <Type className="h-4 w-4 text-gray-400" />
        <span className="font-medium">텍스트</span>
      </div>
      {data.content && (
        <p className="mt-1.5 line-clamp-2 text-[11px] text-app-text-secondary">
          {data.content}
        </p>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !border-2 !border-gray-500 !bg-gray-500"
      />
    </div>
  );
}
