"use client";

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Type } from "lucide-react";

export type TextNodeData = {
  content?: string;
};

export function TextNode({ data, selected }: NodeProps<Node<TextNodeData>>) {
  return (
    <div
      className={`min-w-[180px] max-w-[220px] rounded-2xl border-2 p-3 transition-shadow ${
        selected
          ? "border-gray-400 bg-gray-500/30 shadow-lg shadow-gray-500/30"
          : "border-gray-500 bg-gray-500/20"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-gray-500 !bg-gray-500"
      />
      <div className="flex items-center gap-2">
        <Type className="h-4 w-4 text-gray-400" />
        <span className="text-xs font-semibold text-gray-300">텍스트</span>
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
