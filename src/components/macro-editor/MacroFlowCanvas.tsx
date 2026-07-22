"use client";

import React, { useCallback, useRef, useState, useMemo, type DragEvent } from "react";
import {
  ReactFlow, Controls, MiniMap, Background, BackgroundVariant,
  SelectionMode, type Node, type Edge, type Connection, type NodeTypes,
  MarkerType, applyNodeChanges, applyEdgeChanges,
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
  start: StartNode, condition: ConditionNode, message: MessageNode,
  delay: DelayNode, "ai-response": AIResponseNode, text: TextNode,
};

const defaultEdgeOptions = {
  style: { stroke: "url(#edgeGradient)", strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, color: "#8b5cf6" },
};

interface FlowCanvasProps {
  selectedNode: Node | null; selectedEdgeId: string | null;
  onNodeSelect: (node: Node | null) => void; onEdgeSelect: (edge: Edge | null) => void;
  onNodeDragStop: () => void; onDeleteEdge: (id: string) => void;
  nodes: Node[]; edges: Edge[];
  onNodesChange: (changes: Parameters<typeof applyNodeChanges>[0]) => void;
  onEdgesChange: (changes: Parameters<typeof applyEdgeChanges>[0]) => void;
  onConnect: (connection: Connection) => void;
  onDropNode: (type: string, position: { x: number; y: number }) => void;
  isValidConnection: (connection: Connection) => boolean;
  invalidNodeIds: Set<string>; previewNodeId: string | null;
  onNodeContextMenu?: (e: React.MouseEvent, node: Node) => void;
  onPaneContextMenu?: (e: React.MouseEvent) => void;
}

export function FlowCanvas({
  selectedEdgeId, onNodeSelect, onEdgeSelect, onNodeDragStop, nodes, edges,
  onNodesChange, onEdgesChange, onConnect, onDropNode, isValidConnection,
  invalidNodeIds, previewNodeId, onNodeContextMenu, onPaneContextMenu,
}: FlowCanvasProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [rf, setRf] = useState<any>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  const derivedNodes = useMemo(() => nodes.map((n) => ({
    ...n,
    data: { ...(n.data as object), __invalid: invalidNodeIds.has(n.id), __preview: n.id === previewNodeId },
  })), [nodes, invalidNodeIds, previewNodeId]);

  const derivedEdges = useMemo(() => edges.map((e) => {
    const sel = e.id === selectedEdgeId; const hov = e.id === hoveredEdgeId;
    const prev = previewNodeId && e.target === previewNodeId;
    return { ...e, selected: sel,
      style: { ...(e.style as Record<string, unknown>),
        ...(sel||hov ? { strokeWidth:3, strokeDasharray: hov&&!sel?"8,4":undefined, filter:"drop-shadow(0 0 4px rgba(139,92,246,0.6))" } : {}),
        ...(prev&&!sel&&!hov ? { strokeWidth:3, filter:"drop-shadow(0 0 6px rgba(34,197,94,0.7))" } : {}),
      }, animated: hov||prev,
    };
  }), [edges, selectedEdgeId, hoveredEdgeId, previewNodeId]);

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }, []);
  const onDrop = useCallback((ev: DragEvent<HTMLDivElement>) => {
    ev.preventDefault();
    const t = ev.dataTransfer.getData("application/reactflow");
    if (!t||!ref.current||!rf) return;
    const b = ref.current.getBoundingClientRect();
    onDropNode(t, rf.screenToFlowPosition({ x: ev.clientX-b.left, y: ev.clientY-b.top }));
  }, [rf, onDropNode]);

  const hEc = useCallback((_e: React.MouseEvent, edge: Edge) => { onEdgeSelect(edge); }, [onEdgeSelect]);
  const hPc = useCallback(() => { onNodeSelect(null); onEdgeSelect(null); }, [onNodeSelect, onEdgeSelect]);
  const hNc = useCallback((_e: React.MouseEvent, node: Node) => { onNodeSelect(node); onEdgeSelect(null); }, [onNodeSelect, onEdgeSelect]);

  return (
    <div ref={ref} className="h-full w-full relative" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={derivedNodes} edges={derivedEdges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onConnect={onConnect} onNodeClick={hNc} onEdgeClick={hEc}
        onNodeContextMenu={onNodeContextMenu} onPaneContextMenu={onPaneContextMenu}
        onEdgeMouseEnter={(_e, edge) => setHoveredEdgeId(edge.id)} onEdgeMouseLeave={() => setHoveredEdgeId(null)}
        onPaneClick={hPc} onNodeDragStop={onNodeDragStop} onInit={setRf}
        nodeTypes={nodeTypes} defaultEdgeOptions={defaultEdgeOptions}
        isValidConnection={isValidConnection}
        selectionMode={SelectionMode.Partial} selectNodesOnDrag
        snapToGrid snapGrid={[20, 20]}
        fitView className="bg-app-bg" proOptions={{ hideAttribution: true }}
        connectionLineStyle={{ stroke: "#8b5cf6", strokeWidth: 2 }}
      >
        <svg><defs>
          <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" /><stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs></svg>
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(139,92,246,0.15)" />
        <Controls className="!rounded-xl !border !border-violet-500/20 !bg-app-surface !shadow-lg" position="bottom-left" />
        <MiniMap className="!rounded-xl !border !border-violet-500/20 !bg-app-surface" position="bottom-right"
          nodeColor={(n) => {
            const d = (n.data??{}) as Record<string,unknown>;
            if (d.__preview) return "#22c55e"; if (d.__invalid) return "#ef4444";
            const c: Record<string,string>={start:"#22c55e",condition:"#f59e0b",message:"#8b5cf6",delay:"#3b82f6","ai-response":"#a855f7",text:"#6b7280"};
            return c[n.type??""]??"#6b7280";
          }} maskColor="rgba(0,0,0,0.7)" />
      </ReactFlow>
      {nodes.length===0&&(
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
          <ArrowDown className="mb-3 h-10 w-10 text-violet-400/30 blur-[1px]" />
          <p className="text-sm text-app-text-muted/70">여기에 노드를 드래그해서 시작하세요</p>
        </div>
      )}
    </div>
  );
}
