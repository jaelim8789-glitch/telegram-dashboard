"use client";

import React, { useCallback, useRef, useState, useEffect, type DragEvent } from "react";
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
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider,
  applyNodeChanges,
  applyEdgeChanges,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

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
  animated: true,
  style: {
    stroke: "#8b5cf6",
    strokeWidth: 2,
    strokeDasharray: "5,5",
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
  setNodes: (nodes: Node[] | ((nds: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((eds: Edge[]) => Edge[])) => void;
}

function FlowCanvas({
  onNodeSelect,
  nodes,
  edges,
  setNodes,
  setEdges,
}: FlowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [rfInstance, setRfInstance] = useState<any>(null);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, ...defaultEdgeOptions }, eds));
    },
    [setEdges]
  );

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

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {},
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [rfInstance, setNodes]
  );

  const onNodesChangeHandler = useCallback(
    (changes: any) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [setNodes]
  );

  const onEdgesChangeHandler = useCallback(
    (changes: any) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [setEdges]
  );

  return (
    <div ref={reactFlowWrapper} className="h-full w-full" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChangeHandler}
        onEdgesChange={onEdgesChangeHandler}
        onConnect={onConnect}
        onNodeClick={(_event, node) => onNodeSelect(node)}
        onPaneClick={() => onNodeSelect(null)}
        onInit={setRfInstance}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        className="bg-app-bg"
        proOptions={{ hideAttribution: true }}
      >
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
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="rgba(139, 92, 246, 0.15)"
        />
      </ReactFlow>
    </div>
  );
}

interface MacroFlowCanvasOuterProps {
  selectedNode: Node | null;
  onNodeSelect: (node: Node | null) => void;
  onNodesUpdate: (nodes: Node[]) => void;
  onEdgesUpdate: (edges: Edge[]) => void;
}

export function MacroFlowCanvas({
  selectedNode,
  onNodeSelect,
  onNodesUpdate,
  onEdgesUpdate,
}: MacroFlowCanvasOuterProps) {
  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState([]);

  useEffect(() => {
    onNodesUpdate(nodes);
  }, [nodes, onNodesUpdate]);

  useEffect(() => {
    onEdgesUpdate(edges);
  }, [edges, onEdgesUpdate]);

  return (
    <ReactFlowProvider>
      <FlowCanvas
        selectedNode={selectedNode}
        onNodeSelect={onNodeSelect}
        nodes={nodes}
        edges={edges}
        setNodes={setNodes}
        setEdges={setEdges}
      />
    </ReactFlowProvider>
  );
}
