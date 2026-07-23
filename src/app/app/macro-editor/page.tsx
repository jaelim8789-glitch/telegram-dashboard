"use client";

import { useState, useCallback } from "react";
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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId) ?? null
    : null;

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
      setEdges((eds: Edge[]) =>
        addEdge(
          {
            id: `${connection.source}-${connection.target}`,
            source: connection.source!,
            target: connection.target!,
            animated: true,
            style: { stroke: "url(#edgeGradient)", strokeWidth: 2 },
          },
          eds
        )
      );
    },
    [setEdges]
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
    },
    [setNodes]
  );

  const handleNodeSelect = useCallback((node: Node | null) => {
    setSelectedNodeId(node ? node.id : null);
  }, []);

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

  const handleDeleteNode = useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds: EdgeBase[]) => eds.filter((e) => e.source !== id && e.target !== id));
      setSelectedNodeId(null);
    },
    [setEdges, setNodes]
  );

  const handleDeselect = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const handleTest = useCallback(() => {
    console.log("Test macro flow", { nodes, edges });
  }, [nodes, edges]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    await new Promise((resolve) => setTimeout(resolve, 800));
    console.log("Save macro flow", { nodes, edges });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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
            onNodeSelect={handleNodeSelect}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDropNode={onDropNode}
          />
        </div>
        <div className="w-[300px] shrink-0">
          <PropertiesPanel
            selectedNode={selectedNode}
            onUpdateNode={handleUpdateNode}
            onDeleteNode={handleDeleteNode}
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
