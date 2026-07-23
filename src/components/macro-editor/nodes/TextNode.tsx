"use client";

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Type } from "lucide-react";

export type TextNodeData = {
  content?: string;
};

export function TextNode({ data, selected }: NodeProps<Node<TextNodeData>>) {
  return (
    <div
      className={`min-w-[160px] rounded-xl border bg-gray-500/10 p-3 text-app-text text-xs font-medium transition-shadow ${
        selected
          ? "shadow-lg shadow-violet-500/20 [outline:2px_solid_#8B5CF6]"
          : "border-gray-500/30 hover:shadow-md"
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
