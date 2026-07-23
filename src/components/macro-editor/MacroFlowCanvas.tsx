"use client";

import React, { useCallback, useRef, useState, type DragEvent } from "react";
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  MarkerType,
  applyNodeChanges,
  applyEdgeChanges,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowDown } from "lucide-react";

import { StartNode } from "./nodes/StartNode";
import { ConditionNode } from "./nodes/ConditionNode";
import { MessageNode } from "./nodes/MessageNode";
import { DelayNode } from "./nodes/DelayNode";
import { AIResponseNode } from "./nodes/AIResponseNode";
import { TextNode } from "./nodes/TextNode";

const nodeTypes: NodeTypes = {
  start: StartNode,
  condition: ConditionNode,
  message: MessageNode,
  delay: DelayNode,
  "ai-response": AIResponseNode,
  text: TextNode,
};

const defaultEdgeOptions = {
  style: {
    stroke: "url(#edgeGradient)",
    strokeWidth: 2,
  },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: "#8b5cf6",
  },
};

const initialNodes: Node[] = [
  {
    id: "start-1",
    type: "start",
    position: { x: 350, y: 50 },
    data: {},
  },
];

interface FlowCanvasProps {
  selectedNode: Node | null;
  onNodeSelect: (node: Node | null) => void;
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: Parameters<typeof applyNodeChanges>[0]) => void;
  onEdgesChange: (changes: Parameters<typeof applyEdgeChanges>[0]) => void;
  onConnect: (connection: Connection) => void;
  onDropNode: (type: string, position: { x: number; y: number }) => void;
}

export function FlowCanvas({
  selectedNode,
  onNodeSelect,
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onDropNode,
}: FlowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [rfInstance, setRfInstance] = useState<any>(null);

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");
      if (!type || !reactFlowWrapper.current || !rfInstance) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = rfInstance.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      onDropNode(type, position);
    },
    [rfInstance, onDropNode]
  );

  const hasNodes = nodes.length > 0;

  return (
    <div ref={reactFlowWrapper} className="h-full w-full relative" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_event, node) => onNodeSelect(node)}
        onPaneClick={() => onNodeSelect(null)}
        onInit={setRfInstance}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        className="bg-app-bg"
        proOptions={{ hideAttribution: true }}
        connectionLineStyle={{ stroke: "#8b5cf6", strokeWidth: 2 }}
      >
        <svg>
          <defs>
            <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
        </svg>
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="rgba(139, 92, 246, 0.15)"
        />
        <Controls
          className="!rounded-xl !border !border-violet-500/20 !bg-app-surface !shadow-lg"
          position="bottom-left"
        />
        <MiniMap
          className="!rounded-xl !border !border-violet-500/20 !bg-app-surface"
          position="bottom-right"
          nodeColor={(node) => {
            const colors: Record<string, string> = {
              start: "#22c55e",
              condition: "#f59e0b",
              message: "#8b5cf6",
              delay: "#3b82f6",
              "ai-response": "#a855f7",
              text: "#6b7280",
            };
            return colors[node.type ?? ""] ?? "#6b7280";
          }}
          maskColor="rgba(0,0,0,0.7)"
        />
      </ReactFlow>

      {!hasNodes && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
          <ArrowDown className="mb-3 h-10 w-10 text-violet-400/30 blur-[1px]" />
          <p className="text-sm text-app-text-muted/70">
            여기에 노드를 드래그해서 시작하세요
          </p>
        </div>
      )}
    </div>
  );
}
