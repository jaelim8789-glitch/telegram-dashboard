"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  SelectionMode,
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
  { id: "start-1", type: "start", position: { x: 350, y: 50 }, data: {} },
];

function validateNodes(nodes: Node[]): string[] {
  const errors: string[] = [];
  for (const node of nodes) {
    const d = (node.data ?? {}) as Record<string, unknown>;
    switch (node.type) {
      case "message": if (!d.content || !(d.content as string).trim()) errors.push(node.id); break;
      case "delay": if (!d.delayValue || (d.delayValue as number) <= 0) errors.push(node.id); break;
      case "condition": if (!d.conditionType || !(d.conditionType as string) || !d.conditionValue || !(d.conditionValue as string).trim()) errors.push(node.id); break;
      case "ai-response": if (!d.prompt || !(d.prompt as string).trim()) errors.push(node.id); break;
      case "text": if (!d.content || !(d.content as string).trim()) errors.push(node.id); break;
    }
  }
  return errors;
}

function findFlowPath(nodes: Node[], edges: Edge[]): string[] {
  const adj = new Map<string, string[]>();
  for (const e of edges) { const a = adj.get(e.source) ?? []; a.push(e.target); adj.set(e.source, a); }
  const path: string[] = [];
  const visited = new Set<string>();
  const start = nodes.find((n) => n.type === "start");
  if (!start) return [];
  const queue = [start.id];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    path.push(id);
    for (const next of adj.get(id) ?? []) { queue.push(next); }
  }
  return path;
}

function MacroEditorInner() {
  const [nodes, setNodes, onNodesChangeRaw] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeRaw] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [previewStep, setPreviewStep] = useState(-1);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const previewRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const historyRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const historyIdxRef = useRef(-1);
  const restoringRef = useRef(false);
  const loadedRef = useRef(false);

  const invalidNodeIds = useMemo(() => new Set(validateNodes(nodes)), [nodes]);
  const flowPath = useMemo(() => findFlowPath(nodes, edges), [nodes, edges]);

  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) ?? null : null;

  const snapshot = useCallback((): { nodes: Node[]; edges: Edge[] } => ({
    nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)),
  }), [nodes, edges]);

  const pushHistory = useCallback(() => {
    if (restoringRef.current) return;
    const h = historyRef.current;
    h.length = historyIdxRef.current + 1;
    h.push(snapshot());
    if (h.length > MAX_HISTORY) { h.shift(); } else { historyIdxRef.current = h.length - 1; }
  }, [snapshot]);

  const undo = useCallback(() => {
    if (historyIdxRef.current <= 0) return;
    historyIdxRef.current--;
    restoringRef.current = true;
    const h = historyRef.current[historyIdxRef.current];
    setNodes(h.nodes); setEdges(h.edges);
    setSelectedNodeId(null); setSelectedEdgeId(null);
    setTimeout(() => { restoringRef.current = false; }, 0);
  }, [setNodes, setEdges]);

  const redo = useCallback(() => {
    const h = historyRef.current;
    if (historyIdxRef.current >= h.length - 1) return;
    historyIdxRef.current++;
    restoringRef.current = true;
    const s = h[historyIdxRef.current];
    setNodes(s.nodes); setEdges(s.edges);
    setSelectedNodeId(null); setSelectedEdgeId(null);
    setTimeout(() => { restoringRef.current = false; }, 0);
  }, [setNodes, setEdges]);

  const isValidConnection = useCallback(
    (conn: Connection) => {
      if (conn.source === conn.target) return false;
      if (edges.some((e) => e.source === conn.source && e.target === conn.target && e.sourceHandle === conn.sourceHandle)) return false;
      if (nodes.find((n) => n.id === conn.target)?.type === "start") return false;
      return true;
    },
    [edges, nodes]
  );

  const onNodesChange = useCallback((changes: NodeChange[]) => { onNodesChangeRaw(changes); }, [onNodesChangeRaw]);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => { onEdgesChangeRaw(changes); }, [onEdgesChangeRaw]);

  const onConnect = useCallback((connection: Connection) => {
    if (!isValidConnection(connection)) return;
    const sourceNode = nodes.find((n) => n.id === connection.source);
    const st: Record<string, unknown> = { strokeWidth: 2 };
    let label: string | undefined;
    let color = "#8b5cf6";
    if (sourceNode?.type === "condition" && connection.sourceHandle) {
      color = connection.sourceHandle === "true" ? "#22c55e" : "#ef4444";
      label = connection.sourceHandle === "true" ? "참" : "거짓";
      st.stroke = color;
    } else { st.stroke = "url(#edgeGradient)"; }
    setEdges((eds) => addEdge({
      ...connection, style: st, label,
      labelStyle: label ? { fill: color, fontSize: 10, fontWeight: 600 } : undefined,
      labelBgStyle: label ? { fill: "rgba(10,10,26,0.85)", rx: 4 } : undefined,
      labelBgPadding: label ? ([4, 4] as [number, number]) : undefined,
      labelBgBorderRadius: 4,
      markerEnd: { type: "arrowclosed", color },
    } as any, eds));
    pushHistory();
  }, [nodes, setEdges, isValidConnection, pushHistory]);

  const onDropNode = useCallback((type: string, position: { x: number; y: number }) => {
    setNodes((nds) => [...nds, { id: `${type}-${Date.now()}`, type, position, data: {} }]);
    pushHistory();
  }, [setNodes, pushHistory]);

  const handleNodeSelect = useCallback((node: Node | null) => { setSelectedNodeId(node ? node.id : null); setSelectedEdgeId(null); }, []);
  const handleEdgeSelect = useCallback((edge: Edge | null) => { setSelectedEdgeId(edge ? edge.id : null); setSelectedNodeId(null); }, []);
  const handleNodeDragStop = useCallback(() => { pushHistory(); }, [pushHistory]);

  const handleUpdateNode = useCallback((id: string, data: Record<string, unknown>) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, ...data } } : n));
  }, [setNodes]);
  const handleUpdateNodeDone = useCallback((id: string, data: Record<string, unknown>) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, ...data } } : n));
    pushHistory();
  }, [setNodes, pushHistory]);

  const handleDeleteNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedNodeId(null); pushHistory();
  }, [setEdges, setNodes, pushHistory]);

  const handleDeleteEdge = useCallback((id: string) => {
    setEdges((eds) => eds.filter((e) => e.id !== id)); setSelectedEdgeId(null); pushHistory();
  }, [setEdges, pushHistory]);

  const handleDuplicateNode = useCallback(() => {
    if (!selectedNode) return;
    const newId = `${selectedNode.type}-${Date.now()}`;
    setNodes((nds) => [...nds, { ...JSON.parse(JSON.stringify(selectedNode)), id: newId, position: { x: selectedNode.position.x + 40, y: selectedNode.position.y + 40 } }]);
    setSelectedNodeId(newId); pushHistory();
  }, [selectedNode, setNodes, pushHistory]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedEdgeId) { handleDeleteEdge(selectedEdgeId); return; }
    if (selectedNode) { handleDeleteNode(selectedNode.id); return; }
    const rn = (nodes as Node[]).filter((n: Node) => n.selected);
    if (rn.length > 0) {
      const ids = new Set(rn.map((n) => n.id));
      setNodes((nds) => nds.filter((n) => !ids.has(n.id)));
      setEdges((eds) => eds.filter((e) => !ids.has(e.source) && !ids.has(e.target)));
      pushHistory();
    }
  }, [selectedEdgeId, selectedNode, nodes, handleDeleteEdge, handleDeleteNode, setNodes, setEdges, pushHistory]);

  const handleDeselect = useCallback(() => { setSelectedNodeId(null); setSelectedEdgeId(null); }, []);

  const handlePreview = useCallback(() => {
    if (isPreviewing) { stopPreview(); return; }
    if (flowPath.length === 0) return;
    setIsPreviewing(true); setPreviewStep(0);
    let step = 0;
    previewRef.current = setInterval(() => {
      step++;
      if (step >= flowPath.length) {
        clearInterval(previewRef.current!);
        setIsPreviewing(false); setPreviewStep(-1);
        return;
      }
      setPreviewStep(step);
    }, 600);
  }, [isPreviewing, flowPath]);

  const stopPreview = useCallback(() => {
    if (previewRef.current) clearInterval(previewRef.current);
    setIsPreviewing(false); setPreviewStep(-1);
  }, []);

  const handleTest = useCallback(() => {
    const inv = validateNodes(nodes);
    if (inv.length > 0) { alert(`${inv.length}개의 노드에 필수 입력이 누락되었습니다.`); return; }
    handlePreview();
  }, [nodes, handlePreview]);

  const handleSave = useCallback(async () => {
    const inv = validateNodes(nodes);
    if (inv.length > 0) { alert(`${inv.length}개의 노드에 필수 입력이 누락되었습니다.`); return; }
    setSaving(true); setSaved(false);
    await new Promise((r) => setTimeout(r, 800));
    localStorage.setItem(STORAGE_NODES, JSON.stringify(nodes));
    localStorage.setItem(STORAGE_EDGES, JSON.stringify(edges));
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }, [nodes, edges]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) { e.preventDefault(); redo(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === "d") { e.preventDefault(); handleDuplicateNode(); return; }
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); handleDeleteSelected(); return; }
      if (e.key === "Escape") { stopPreview(); handleDeselect(); return; }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, handleDuplicateNode, handleDeleteSelected, handleDeselect, stopPreview]);

  useEffect(() => {
    if (loadedRef.current) return;
    try {
      const rawN = localStorage.getItem(STORAGE_NODES);
      const rawE = localStorage.getItem(STORAGE_EDGES);
      if (rawN) setNodes(JSON.parse(rawN));
      if (rawE) setEdges(JSON.parse(rawE));
    } catch { /* ignore */ }
    loadedRef.current = true;
  }, [setNodes, setEdges]);

  useEffect(() => {
    if (!loadedRef.current || restoringRef.current) return;
    const t = setTimeout(() => {
      localStorage.setItem(STORAGE_NODES, JSON.stringify(nodes));
      localStorage.setItem(STORAGE_EDGES, JSON.stringify(edges));
    }, 1000);
    return () => clearTimeout(t);
  }, [nodes, edges]);

  useEffect(() => { return () => { if (previewRef.current) clearInterval(previewRef.current); }; }, []);

  const selectedNodeCount = (nodes as Node[]).filter((n: Node) => n.selected).length;

  return (
    <div className="flex h-screen flex-col">
      <TopBar
        onTest={handleTest}
        onSave={handleSave}
        onPreview={handlePreview}
        saving={saving}
        saved={saved}
        errorCount={invalidNodeIds.size}
        isPreviewing={isPreviewing}
        selectedCount={selectedNodeCount}
      />
      <div className="flex flex-1 overflow-hidden relative">
        <div className={`shrink-0 transition-all duration-250 ease-out ${leftPanelOpen ? "w-[240px]" : "w-0 overflow-hidden"}`}>
          <NodePalette collapsed={!leftPanelOpen} onToggle={() => setLeftPanelOpen(!leftPanelOpen)} />
        </div>
        {!leftPanelOpen && (
          <button onClick={() => setLeftPanelOpen(true)} className="absolute left-0 top-1/2 z-20 -translate-y-1/2 rounded-r-lg border border-l-0 border-violet-500/20 bg-app-surface px-1.5 py-3 text-app-text-muted hover:text-app-text">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 18l6-6-6-6" /></svg>
          </button>
        )}
        <div className="flex-1">
          <FlowCanvas
            selectedNode={selectedNode}
            selectedEdgeId={selectedEdgeId}
            onNodeSelect={handleNodeSelect}
            onEdgeSelect={handleEdgeSelect}
            onNodeDragStop={handleNodeDragStop}
            onDeleteEdge={handleDeleteEdge}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDropNode={onDropNode}
            isValidConnection={isValidConnection}
            invalidNodeIds={invalidNodeIds}
            previewNodeId={isPreviewing && previewStep >= 0 ? flowPath[previewStep] : null}
          />
        </div>
        {!rightPanelOpen && (
          <button onClick={() => setRightPanelOpen(true)} className="absolute right-0 top-1/2 z-20 -translate-y-1/2 rounded-l-lg border border-r-0 border-violet-500/20 bg-app-surface px-1.5 py-3 text-app-text-muted hover:text-app-text">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 18l-6-6 6-6" /></svg>
          </button>
        )}
        <div className={`shrink-0 transition-all duration-250 ease-out ${rightPanelOpen ? "w-[300px]" : "w-0 overflow-hidden"}`}>
          <PropertiesPanel
            selectedNode={selectedNode}
            selectedEdgeId={selectedEdgeId}
            onUpdateNode={handleUpdateNode}
            onUpdateNodeDone={handleUpdateNodeDone}
            onDeleteNode={handleDeleteNode}
            onDeleteEdge={handleDeleteEdge}
            onDeselect={handleDeselect}
            collapsed={!rightPanelOpen}
            onToggle={() => setRightPanelOpen(!rightPanelOpen)}
          />
        </div>
      </div>
    </div>
  );
}

export default function MacroEditorPage() {
  return <ReactFlowProvider><MacroEditorInner /></ReactFlowProvider>;
}
