"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { GripVertical } from "lucide-react";

export function DraggableList({ items, onReorder, renderItem }: { items: { id: string }[]; onReorder: (ids: string[]) => void; renderItem: (item: any, index: number) => React.ReactNode }) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const handleDrop = useCallback(() => {
    if (dragIdx === null || overIdx === null) return;
    const newItems = [...items];
    const [dragged] = newItems.splice(dragIdx, 1);
    newItems.splice(overIdx, 0, dragged);
    onReorder(newItems.map(i => i.id));
    setDragIdx(null); setOverIdx(null);
  }, [dragIdx, overIdx, items, onReorder]);

  return (
    <div className="space-y-1">
      {items.map((item, idx) => (
        <div key={item.id} draggable onDragStart={() => setDragIdx(idx)} onDragOver={e => { e.preventDefault(); setOverIdx(idx); }} onDragEnd={handleDrop}
          className={`flex items-center gap-2 rounded-xl px-3 py-2 transition-colors ${overIdx === idx ? "bg-app-card-hover ring-1 ring-app-primary" : ""}`}>
          <GripVertical className="h-4 w-4 text-app-text-muted cursor-grab shrink-0" />
          <div className="flex-1">{renderItem(item, idx)}</div>
        </div>
      ))}
    </div>
  );
}
