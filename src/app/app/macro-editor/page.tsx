"use client";

import { useState, useCallback } from "react";
import type { Node, Edge } from "@xyflow/react";
import { TopBar } from "@/components/macro-editor/TopBar";
import { NodePalette } from "@/components/macro-editor/NodePalette";
import { MacroFlowCanvas } from "@/components/macro-editor/MacroFlowCanvas";
import { PropertiesPanel } from "@/components/macro-editor/PropertiesPanel";

export default function MacroEditorPage() {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [saving, setSaving] = useState(false);

  const handleTest = useCallback(() => {
    console.log("Test macro flow", { nodes, edges });
  }, [nodes, edges]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    console.log("Save macro flow", { nodes, edges });
    setSaving(false);
  }, [nodes, edges]);

  const handleUpdateNode = useCallback(
    (id: string, data: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n))
      );
    },
    []
  );

  const handleDeleteNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedNode((prev) => (prev?.id === id ? null : prev));
  }, []);

  const handleDeselect = useCallback(() => {
    setSelectedNode(null);
  }, []);

  return (
    <div className="flex h-screen flex-col">
      <TopBar onTest={handleTest} onSave={handleSave} saving={saving} />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[240px] shrink-0">
          <NodePalette />
        </div>
        <div className="flex-1">
          <MacroFlowCanvas
            selectedNode={selectedNode}
            onNodeSelect={setSelectedNode}
            onNodesUpdate={setNodes}
            onEdgesUpdate={setEdges}
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
