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
  const path: string[] = []; const visited = new Set<string>();
  const start = nodes.find((n) => n.type === "start");
  if (!start) return [];
  const queue = [start.id];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id); path.push(id);
    for (const next of adj.get(id) ?? []) { queue.push(next); }
  }
  return path;
}

type CtxMenu = { x: number; y: number; type: "canvas" | "node"; nodeId?: string } | null;

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
  const [ctxMenu, setCtxMenu] = useState<CtxMenu>(null);
  const prevRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const histRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const histIdxRef = useRef(-1);
  const restoringRef = useRef(false);
  const loadedRef = useRef(false);

  const invalidNodeIds = useMemo(() => new Set(validateNodes(nodes)), [nodes]);
  const flowPath = useMemo(() => findFlowPath(nodes, edges), [nodes, edges]);
  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) ?? null : null;
  const selNodeCount = (nodes as Node[]).filter((n: Node) => n.selected).length;

  const snap = useCallback((): { nodes: Node[]; edges: Edge[] } => ({
    nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)),
  }), [nodes, edges]);

  const pushHist = useCallback(() => {
    if (restoringRef.current) return;
    const h = histRef.current; h.length = histIdxRef.current + 1; h.push(snap());
    if (h.length > MAX_HISTORY) { h.shift(); } else { histIdxRef.current = h.length - 1; }
  }, [snap]);

  const undo = useCallback(() => {
    if (histIdxRef.current <= 0) return; histIdxRef.current--;
    restoringRef.current = true;
    const h = histRef.current[histIdxRef.current]; setNodes(h.nodes); setEdges(h.edges);
    setSelectedNodeId(null); setSelectedEdgeId(null);
    setTimeout(() => { restoringRef.current = false; }, 0);
  }, [setNodes, setEdges]);

  const redo = useCallback(() => {
    const h = histRef.current;
    if (histIdxRef.current >= h.length - 1) return; histIdxRef.current++;
    restoringRef.current = true;
    const s = h[histIdxRef.current]; setNodes(s.nodes); setEdges(s.edges);
    setSelectedNodeId(null); setSelectedEdgeId(null);
    setTimeout(() => { restoringRef.current = false; }, 0);
  }, [setNodes, setEdges]);

  const isValidConnection = useCallback((conn: Connection) => {
    if (conn.source === conn.target) return false;
    if (edges.some((e) => e.source === conn.source && e.target === conn.target && e.sourceHandle === conn.sourceHandle)) return false;
    if (nodes.find((n) => n.id === conn.target)?.type === "start") return false;
    return true;
  }, [edges, nodes]);

  const onNodesChange = useCallback((c: NodeChange[]) => { onNodesChangeRaw(c); }, [onNodesChangeRaw]);
  const onEdgesChange = useCallback((c: EdgeChange[]) => { onEdgesChangeRaw(c); }, [onEdgesChangeRaw]);

  const onConnect = useCallback((c: Connection) => {
    if (!isValidConnection(c)) return;
    const src = nodes.find((n) => n.id === c.source);
    const st: Record<string, unknown> = { strokeWidth: 2 };
    let lab: string | undefined; let col = "#8b5cf6";
    if (src?.type === "condition" && c.sourceHandle) {
      col = c.sourceHandle === "true" ? "#22c55e" : "#ef4444";
      lab = c.sourceHandle === "true" ? "참" : "거짓"; st.stroke = col;
    } else { st.stroke = "url(#edgeGradient)"; }
    setEdges((eds) => addEdge({ ...c, style: st, label: lab,
      labelStyle: lab ? { fill: col, fontSize: 10, fontWeight: 600 } : undefined,
      labelBgStyle: lab ? { fill: "rgba(10,10,26,0.85)", rx: 4 } : undefined,
      labelBgPadding: lab ? ([4,4] as [number,number]) : undefined, labelBgBorderRadius: 4,
      markerEnd: { type: "arrowclosed", color: col },
    } as any, eds)); pushHist();
  }, [nodes, setEdges, isValidConnection, pushHist]);

  const onDropNode = useCallback((t: string, p: { x: number; y: number }) => {
    setNodes((nds) => [...nds, { id: `${t}-${Date.now()}`, type: t, position: p, data: {} }]); pushHist();
  }, [setNodes, pushHist]);

  const handleNodeSelect = useCallback((n: Node | null) => { setSelectedNodeId(n ? n.id : null); setSelectedEdgeId(null); }, []);
  const handleEdgeSelect = useCallback((e: Edge | null) => { setSelectedEdgeId(e ? e.id : null); setSelectedNodeId(null); }, []);
  const handleNodeDragStop = useCallback(() => { pushHist(); }, [pushHist]);
  const handleUpd = useCallback((id: string, data: Record<string, unknown>) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, ...data } } : n));
  }, [setNodes]);
  const handleUpdDone = useCallback((id: string, data: Record<string, unknown>) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, ...data } } : n)); pushHist();
  }, [setNodes, pushHist]);
  const handleDelNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id)); setSelectedNodeId(null); pushHist();
  }, [setEdges, setNodes, pushHist]);
  const handleDelEdge = useCallback((id: string) => {
    setEdges((eds) => eds.filter((e) => e.id !== id)); setSelectedEdgeId(null); pushHist();
  }, [setEdges, pushHist]);
  const handleDupNode = useCallback(() => {
    if (!selectedNode) return;
    const nid = `${selectedNode.type}-${Date.now()}`;
    setNodes((nds) => [...nds, { ...JSON.parse(JSON.stringify(selectedNode)), id: nid, position: { x: selectedNode.position.x + 40, y: selectedNode.position.y + 40 } }]);
    setSelectedNodeId(nid); pushHist();
  }, [selectedNode, setNodes, pushHist]);
  const handleDelSel = useCallback(() => {
    if (selectedEdgeId) { handleDelEdge(selectedEdgeId); return; }
    if (selectedNode) { handleDelNode(selectedNode.id); return; }
    const rn = (nodes as Node[]).filter((n: Node) => n.selected);
    if (rn.length > 0) {
      const ids = new Set(rn.map((n) => n.id));
      setNodes((nds) => nds.filter((n) => !ids.has(n.id)));
      setEdges((eds) => eds.filter((e) => !ids.has(e.source) && !ids.has(e.target))); pushHist();
    }
  }, [selectedEdgeId, selectedNode, nodes, handleDelEdge, handleDelNode, setEdges, pushHist]);
  const handleDesel = useCallback(() => { setSelectedNodeId(null); setSelectedEdgeId(null); setCtxMenu(null); }, []);

  const stopPrev = useCallback(() => {
    if (prevRef.current) clearInterval(prevRef.current); setIsPreviewing(false); setPreviewStep(-1);
  }, []);
  const handlePreview = useCallback(() => {
    if (isPreviewing) { stopPrev(); return; }
    if (flowPath.length === 0) return;
    setIsPreviewing(true); setPreviewStep(0); let s = 0;
    prevRef.current = setInterval(() => { s++;
      if (s >= flowPath.length) { clearInterval(prevRef.current!); setIsPreviewing(false); setPreviewStep(-1); return; }
      setPreviewStep(s); }, 600);
  }, [isPreviewing, flowPath, stopPrev]);

  const handleTest = useCallback(() => {
    const inv = validateNodes(nodes);
    if (inv.length > 0) { alert(`${inv.length}개 노드 필수 입력 누락`); return; }
    handlePreview();
  }, [nodes, handlePreview]);

  const handleSave = useCallback(async () => {
    const inv = validateNodes(nodes);
    if (inv.length > 0) { alert(`${inv.length}개 노드 필수 입력 누락`); return; }
    setSaving(true); setSaved(false); await new Promise((r) => setTimeout(r, 800));
    localStorage.setItem(STORAGE_NODES, JSON.stringify(nodes));
    localStorage.setItem(STORAGE_EDGES, JSON.stringify(edges));
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 3000);
  }, [nodes, edges]);

  const handleExport = useCallback(() => {
    const data = JSON.stringify({ nodes, edges }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "macro-flow.json"; a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

  const handleImport = useCallback(() => { fileRef.current?.click(); }, []);
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.nodes && data.edges) { setNodes(data.nodes); setEdges(data.edges); pushHist(); }
      } catch { alert("유효하지 않은 JSON 파일입니다."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, [setNodes, setEdges, pushHist]);

  const handleAutoLayout = useCallback(() => {
    const adj = new Map<string, string[]>();
    const rev = new Map<string, string[]>();
    for (const e of edges) {
      const a = adj.get(e.source) ?? []; a.push(e.target); adj.set(e.source, a);
      const r = rev.get(e.target) ?? []; r.push(e.source); rev.set(e.target, r);
    }
    const start = nodes.find((n) => n.type === "start");
    if (!start) return;
    const levels = new Map<string, number>();
    const q = [start.id]; levels.set(start.id, 0);
    while (q.length > 0) {
      const id = q.shift()!; const lv = levels.get(id)!;
      for (const next of adj.get(id) ?? []) {
        if (!levels.has(next)) { levels.set(next, lv + 1); q.push(next); }
      }
    }
    const byLevel = new Map<number, string[]>();
    for (const [id, lv] of levels) { const a = byLevel.get(lv) ?? []; a.push(id); byLevel.set(lv, a); }
    const maxCols = Math.max(...Array.from(byLevel.values()).map((a) => a.length), 1);
    setNodes((nds) => nds.map((n) => {
      const lv = levels.get(n.id);
      if (lv === undefined) return n;
      const col = byLevel.get(lv)!.indexOf(n.id);
      const xOff = (maxCols - byLevel.get(lv)!.length) * 100;
      return { ...n, position: { x: 200 + xOff + col * 220, y: 80 + lv * 150 } };
    })); pushHist();
  }, [nodes, edges, setNodes, pushHist]);

  const alignNodes = useCallback((axis: "x" | "y", value: "min" | "mid" | "max") => {
    const sel = (nodes as Node[]).filter((n: Node) => n.selected);
    if (sel.length < 2) return;
    setNodes((nds) => {
      const vals = sel.map((n) => n.position[axis]);
      const target = axis === "x"
        ? (value === "min" ? Math.min(...vals) : value === "max" ? Math.max(...vals) : Math.round(vals.reduce((a,b) => a+b, 0) / vals.length))
        : (value === "min" ? Math.min(...vals) : value === "max" ? Math.max(...vals) : Math.round(vals.reduce((a,b) => a+b, 0) / vals.length));
      return nds.map((n) => n.selected ? { ...n, position: { ...n.position, [axis]: target } } : n);
    }); pushHist();
  }, [nodes, setNodes, pushHist]);

  const distNodes = useCallback((axis: "x" | "y") => {
    const sel = (nodes as Node[]).filter((n: Node) => n.selected);
    if (sel.length < 2) return;
    const sorted = [...sel].sort((a, b) => a.position[axis] - b.position[axis]);
    const min = sorted[0].position[axis];
    const max = sorted[sorted.length - 1].position[axis];
    const step = (max - min) / (sorted.length - 1);
    const posMap = new Map(sorted.map((s, i) => [s.id, min + step * i]));
    setNodes((nds) => nds.map((n) => posMap.has(n.id) ? { ...n, position: { ...n.position, [axis]: posMap.get(n.id)! } } : n));
    pushHist();
  }, [nodes, setNodes, pushHist]);

  const onNodeContextMenu = useCallback((_e: React.MouseEvent, node: Node) => {
    _e.preventDefault(); setCtxMenu({ x: _e.clientX, y: _e.clientY, type: "node", nodeId: node.id });
  }, []);
  const onPaneContextMenu = useCallback((_e: React.MouseEvent) => {
    _e.preventDefault(); setCtxMenu({ x: _e.clientX, y: _e.clientY, type: "canvas" });
  }, []);

  const addNodeFromMenu = useCallback((t: string) => {
    setNodes((nds) => [...nds, { id: `${t}-${Date.now()}`, type: t, position: { x: ctxMenu!.x - 120, y: ctxMenu!.y - 60 }, data: {} }]);
    setCtxMenu(null); pushHist();
  }, [ctxMenu, setNodes, pushHist]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) { e.preventDefault(); redo(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === "d") { e.preventDefault(); handleDupNode(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); handleSave(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === "e") { e.preventDefault(); handleExport(); return; }
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); handleDelSel(); return; }
      if (e.key === "Escape") { stopPrev(); handleDesel(); return; }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, handleDupNode, handleDelSel, handleDesel, stopPrev, handleSave, handleExport]);

  useEffect(() => {
    if (loadedRef.current) return;
    try { const n = localStorage.getItem(STORAGE_NODES); const e = localStorage.getItem(STORAGE_EDGES);
      if (n) setNodes(JSON.parse(n)); if (e) setEdges(JSON.parse(e)); } catch { /* */ }
    loadedRef.current = true;
  }, [setNodes, setEdges]);

  useEffect(() => {
    if (!loadedRef.current || restoringRef.current) return;
    const t = setTimeout(() => { localStorage.setItem(STORAGE_NODES, JSON.stringify(nodes)); localStorage.setItem(STORAGE_EDGES, JSON.stringify(edges)); }, 1000);
    return () => clearTimeout(t);
  }, [nodes, edges]);

  useEffect(() => { return () => { if (prevRef.current) clearInterval(prevRef.current); }; }, []);

  const nodeTypes = ["start","condition","message","delay","ai-response","text"];
  const nodeLabels: Record<string, string> = { start:"시작", condition:"조건", message:"메시지", delay:"지연", "ai-response":"AI 응답", text:"텍스트" };

  return (
    <div className="flex h-screen flex-col" onClick={() => setCtxMenu(null)}>
      <input ref={fileRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" />
      <TopBar
        onTest={handleTest} onSave={handleSave} onPreview={handlePreview} onExport={handleExport} onImport={handleImport}
        onAutoLayout={handleAutoLayout} saving={saving} saved={saved} errorCount={invalidNodeIds.size}
        isPreviewing={isPreviewing} selectedCount={selNodeCount}
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
            selectedNode={selectedNode} selectedEdgeId={selectedEdgeId}
            onNodeSelect={handleNodeSelect} onEdgeSelect={handleEdgeSelect}
            onNodeDragStop={handleNodeDragStop} onDeleteEdge={handleDelEdge}
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onConnect={onConnect} onDropNode={onDropNode} isValidConnection={isValidConnection}
            invalidNodeIds={invalidNodeIds}
            previewNodeId={isPreviewing && previewStep >= 0 ? flowPath[previewStep] : null}
            onNodeContextMenu={onNodeContextMenu} onPaneContextMenu={onPaneContextMenu}
          />
        </div>
        {!rightPanelOpen && (
          <button onClick={() => setRightPanelOpen(true)} className="absolute right-0 top-1/2 z-20 -translate-y-1/2 rounded-l-lg border border-r-0 border-violet-500/20 bg-app-surface px-1.5 py-3 text-app-text-muted hover:text-app-text">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 18l-6-6 6-6" /></svg>
          </button>
        )}
        <div className={`shrink-0 transition-all duration-250 ease-out ${rightPanelOpen ? "w-[300px]" : "w-0 overflow-hidden"}`}>
          <PropertiesPanel
            selectedNode={selectedNode} selectedEdgeId={selectedEdgeId}
            onUpdateNode={handleUpd} onUpdateNodeDone={handleUpdDone}
            onDeleteNode={handleDelNode} onDeleteEdge={handleDelEdge} onDeselect={handleDesel}
            collapsed={!rightPanelOpen} onToggle={() => setRightPanelOpen(!rightPanelOpen)}
          />
        </div>
      </div>

      {ctxMenu && (
        <div
          className="fixed z-50 min-w-[160px] rounded-xl border border-violet-500/20 bg-app-surface shadow-xl shadow-black/40 py-1"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
        >
          {ctxMenu.type === "canvas" && (
            <>
              <div className="px-3 py-1.5 text-[10px] text-app-text-muted">노드 추가</div>
              {nodeTypes.map((t) => (
                <button key={t} onClick={() => addNodeFromMenu(t)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-app-text hover:bg-app-card-hover"
                >{nodeLabels[t]}</button>
              ))}
              <div className="my-1 border-t border-violet-500/10" />
              <button onClick={() => { const all = nodes.map((n) => ({ ...n, selected: true })); setNodes(all); setCtxMenu(null); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-app-text hover:bg-app-card-hover"
              >전체 선택 ⌘A</button>
            </>
          )}
          {ctxMenu.type === "node" && ctxMenu.nodeId && (
            <>
              <button onClick={() => { setSelectedNodeId(ctxMenu.nodeId!); handleDupNode(); setCtxMenu(null); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-app-text hover:bg-app-card-hover"
              >복제 ⌘D</button>
              <button onClick={() => { handleDelNode(ctxMenu.nodeId!); setCtxMenu(null); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
              >삭제 Delete</button>
            </>
          )}
        </div>
      )}

      {selNodeCount >= 2 && (
        <div className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 flex items-center gap-1 rounded-xl border border-violet-500/20 bg-app-surface px-3 py-2 shadow-lg">
          <span className="text-[10px] text-app-text-muted mr-1">정렬</span>
          <button onClick={() => alignNodes("x","min")} title="왼쪽 정렬" className="rounded p-1 text-app-text-muted hover:text-app-text"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="6" x2="4" y2="18"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="16" x2="14" y2="16"/></svg></button>
          <button onClick={() => alignNodes("x","mid")} title="중앙 정렬" className="rounded p-1 text-app-text-muted hover:text-app-text"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="6" x2="12" y2="18"/><line x1="6" y1="8" x2="18" y2="8"/><line x1="8" y1="16" x2="16" y2="16"/></svg></button>
          <button onClick={() => alignNodes("x","max")} title="오른쪽 정렬" className="rounded p-1 text-app-text-muted hover:text-app-text"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="20" y1="6" x2="20" y2="18"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="10" y1="16" x2="16" y2="16"/></svg></button>
          <div className="w-px h-4 bg-violet-500/20 mx-1" />
          <button onClick={() => distNodes("x")} title="가로 균등분배" className="rounded p-1 text-app-text-muted hover:text-app-text"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="6" x2="4" y2="18"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="20" y1="6" x2="20" y2="18"/></svg></button>
          <div className="w-px h-4 bg-violet-500/20 mx-1" />
          <button onClick={() => alignNodes("y","min")} title="위쪽 정렬" className="rounded p-1 text-app-text-muted hover:text-app-text"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="6" y1="4" x2="18" y2="4"/><line x1="8" y1="8" x2="8" y2="16"/><line x1="16" y1="10" x2="16" y2="16"/></svg></button>
          <button onClick={() => alignNodes("y","mid")} title="세로 중앙 정렬" className="rounded p-1 text-app-text-muted hover:text-app-text"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="6" y1="12" x2="18" y2="12"/><line x1="8" y1="4" x2="8" y2="20"/><line x1="16" y1="6" x2="16" y2="18"/></svg></button>
          <button onClick={() => alignNodes("y","max")} title="아래쪽 정렬" className="rounded p-1 text-app-text-muted hover:text-app-text"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="6" y1="20" x2="18" y2="20"/><line x1="8" y1="8" x2="8" y2="16"/><line x1="16" y1="10" x2="16" y2="16"/></svg></button>
          <button onClick={() => distNodes("y")} title="세로 균등분배" className="rounded p-1 text-app-text-muted hover:text-app-text"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="6" y1="4" x2="18" y2="4"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="6" y1="20" x2="18" y2="20"/></svg></button>
        </div>
      )}
    </div>
  );
}

export default function MacroEditorPage() {
  return <ReactFlowProvider><MacroEditorInner /></ReactFlowProvider>;
}
