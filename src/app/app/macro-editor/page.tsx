"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import { TopBar } from "@/components/macro-editor/TopBar";
import { NodePalette } from "@/components/macro-editor/NodePalette";
import { FlowCanvas } from "@/components/macro-editor/MacroFlowCanvas";
import { PropertiesPanel } from "@/components/macro-editor/PropertiesPanel";

const STORAGE_NODES = "macro-editor-nodes";
const STORAGE_EDGES = "macro-editor-edges";
const MAX_HISTORY = 50;

const initialNodes: Node[] = [
  {
    id: "start-1",
    type: "start",
    position: { x: 350, y: 50 },
    data: {},
  },
];

function MacroEditorInner() {
  const [nodes, setNodes, onNodesChangeRaw] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeRaw] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const historyRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const historyIdxRef = useRef(-1);
  const restoringRef = useRef(false);
  const loadedRef = useRef(false);

  const snapshot = useCallback((): { nodes: Node[]; edges: Edge[] } => ({
    nodes: JSON.parse(JSON.stringify(nodes)),
    edges: JSON.parse(JSON.stringify(edges)),
  }), [nodes, edges]);

  const pushHistory = useCallback(() => {
    if (restoringRef.current) return;
    const h = historyRef.current;
    h.length = historyIdxRef.current + 1;
    h.push(snapshot());
    if (h.length > MAX_HISTORY) { h.shift(); } else { historyIdxRef.current = h.length - 1; }
  }, [snapshot]);

  const undo = useCallback(() => {
    const h = historyRef.current;
    if (historyIdxRef.current <= 0) return;
    historyIdxRef.current--;
    restoringRef.current = true;
    const { nodes: n, edges: e } = h[historyIdxRef.current];
    setNodes(n);
    setEdges(e);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setTimeout(() => { restoringRef.current = false; }, 0);
  }, [setNodes, setEdges]);

  const redo = useCallback(() => {
    const h = historyRef.current;
    if (historyIdxRef.current >= h.length - 1) return;
    historyIdxRef.current++;
    restoringRef.current = true;
    const { nodes: n, edges: e } = h[historyIdxRef.current];
    setNodes(n);
    setEdges(e);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setTimeout(() => { restoringRef.current = false; }, 0);
  }, [setNodes, setEdges]);

  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId) ?? null
    : null;

  const isValidConnection = useCallback(
    (conn: Connection) => {
      if (conn.source === conn.target) return false;
      const dup = edges.some(
        (e) =>
          e.source === conn.source &&
          e.target === conn.target &&
          e.sourceHandle === conn.sourceHandle
      );
      if (dup) return false;
      const targetNode = nodes.find((n) => n.id === conn.target);
      if (targetNode?.type === "start") return false;
      return true;
    },
    [edges, nodes]
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeRaw(changes);
    },
    [onNodesChangeRaw]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChangeRaw(changes);
    },
    [onEdgesChangeRaw]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!isValidConnection(connection)) return;

      const sourceNode = nodes.find((n) => n.id === connection.source);
      let edgeProps: Record<string, unknown> = {
        style: { stroke: "url(#edgeGradient)", strokeWidth: 2 },
      };

      if (sourceNode?.type === "condition" && connection.sourceHandle) {
        const isTrue = connection.sourceHandle === "true";
        edgeProps = {
          ...edgeProps,
          label: isTrue ? "참" : "거짓",
          labelStyle: { fill: isTrue ? "#22c55e" : "#ef4444", fontSize: 10, fontWeight: 600 },
          labelBgStyle: { fill: "rgba(10,10,26,0.85)", rx: 4 },
          labelBgPadding: [4, 4] as [number, number],
          labelBgBorderRadius: 4,
          style: { stroke: isTrue ? "#22c55e" : "#ef4444", strokeWidth: 2 },
        };
        (edgeProps as any).markerEnd = {
          type: "arrowclosed",
          color: isTrue ? "#22c55e" : "#ef4444",
        };
      } else {
        (edgeProps as any).markerEnd = {
          type: "arrowclosed",
          color: "#8b5cf6",
        };
      }

      setEdges((eds) =>
        addEdge(
          { ...connection, ...edgeProps } as any,
          eds
        )
      );
      pushHistory();
    },
    [nodes, setEdges, isValidConnection, pushHistory]
  );

  const onDropNode = useCallback(
    (type: string, position: { x: number; y: number }) => {
      const newId = `${type}-${Date.now()}`;
      const newNode: Node = {
        id: newId,
        type,
        position,
        data: {},
      };
      setNodes((nds) => [...nds, newNode]);
      pushHistory();
    },
    [setNodes, pushHistory]
  );

  const handleNodeSelect = useCallback((node: Node | null) => {
    setSelectedNodeId(node ? node.id : null);
    setSelectedEdgeId(null);
  }, []);

  const handleEdgeSelect = useCallback((edge: Edge | null) => {
    setSelectedEdgeId(edge ? edge.id : null);
    setSelectedNodeId(null);
  }, []);

  const handleNodeDragStop = useCallback(() => {
    pushHistory();
  }, [pushHistory]);

  const handleUpdateNode = useCallback(
    (id: string, data: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...data } } : n
        )
      );
    },
    [setNodes]
  );

  const handleUpdateNodeDone = useCallback(
    (id: string, data: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...data } } : n
        )
      );
      pushHistory();
    },
    [setNodes, pushHistory]
  );

  const handleDeleteNode = useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
      setSelectedNodeId(null);
      pushHistory();
    },
    [setEdges, setNodes, pushHistory]
  );

  const handleDeleteEdge = useCallback(
    (id: string) => {
      setEdges((eds) => eds.filter((e) => e.id !== id));
      setSelectedEdgeId(null);
      pushHistory();
    },
    [setEdges, pushHistory]
  );

  const handleDuplicateNode = useCallback(() => {
    if (!selectedNode) return;
    const newId = `${selectedNode.type}-${Date.now()}`;
    const duplicated: Node = {
      ...JSON.parse(JSON.stringify(selectedNode)),
      id: newId,
      position: {
        x: selectedNode.position.x + 40,
        y: selectedNode.position.y + 40,
      },
    };
    setNodes((nds) => [...nds, duplicated]);
    setSelectedNodeId(newId);
    pushHistory();
  }, [selectedNode, setNodes, pushHistory]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedEdgeId) {
      handleDeleteEdge(selectedEdgeId);
    } else if (selectedNode) {
      handleDeleteNode(selectedNode.id);
    }
  }, [selectedEdgeId, selectedNode, handleDeleteEdge, handleDeleteNode]);

  const handleDeselect = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, []);

  const handleTest = useCallback(() => {
    console.log("Test macro flow", { nodes, edges });
  }, [nodes, edges]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    await new Promise((resolve) => setTimeout(resolve, 800));
    localStorage.setItem(STORAGE_NODES, JSON.stringify(nodes));
    localStorage.setItem(STORAGE_EDGES, JSON.stringify(edges));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }, [nodes, edges]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "d") {
        e.preventDefault();
        handleDuplicateNode();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        handleDeleteSelected();
        return;
      }
      if (e.key === "Escape") {
        handleDeselect();
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, handleDuplicateNode, handleDeleteSelected, handleDeselect]);

  useEffect(() => {
    if (loadedRef.current) return;
    try {
      const rawN = localStorage.getItem(STORAGE_NODES);
      const rawE = localStorage.getItem(STORAGE_EDGES);
      if (rawN) setNodes(JSON.parse(rawN));
      if (rawE) setEdges(JSON.parse(rawE));
    } catch { /* ignore corrupt data */ }
    loadedRef.current = true;
  }, [setNodes, setEdges]);

  useEffect(() => {
    if (!loadedRef.current || restoringRef.current) return;
    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_NODES, JSON.stringify(nodes));
      localStorage.setItem(STORAGE_EDGES, JSON.stringify(edges));
    }, 1000);
    return () => clearTimeout(timer);
  }, [nodes, edges]);

  return (
    <div className="flex h-screen flex-col">
      <TopBar onTest={handleTest} onSave={handleSave} saving={saving} saved={saved} />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[240px] shrink-0">
          <NodePalette />
        </div>
        <div className="flex-1">
          <FlowCanvas
            selectedNode={selectedNode}
            selectedEdgeId={selectedEdgeId}
            onNodeSelect={handleNodeSelect}
            onEdgeSelect={handleEdgeSelect}
            onNodeDragStop={handleNodeDragStop}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDropNode={onDropNode}
            isValidConnection={isValidConnection}
          />
        </div>
        <div className="w-[300px] shrink-0">
          <PropertiesPanel
            selectedNode={selectedNode}
            selectedEdgeId={selectedEdgeId}
            onUpdateNode={handleUpdateNode}
            onUpdateNodeDone={handleUpdateNodeDone}
            onDeleteNode={handleDeleteNode}
            onDeleteEdge={handleDeleteEdge}
            onDeselect={handleDeselect}
          />
        </div>
      </div>
    </div>
  );
}

export default function MacroEditorPage() {
  return (
    <ReactFlowProvider>
      <MacroEditorInner />
    </ReactFlowProvider>
  );
}
