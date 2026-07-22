"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Panel } from "@/components/ui/Panel";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

export function useToastPosition() {
  const [pos, setPos] = useState<"top" | "bottom">("top");
  return { pos, setPos };
}

export function ToastConfigPanel() {
  const [duration, setDuration] = useState(4000);
  const [position, setPosition] = useState<"top" | "bottom">("top");

  return (
    <Panel title="토스트 설정" className="w-full">
      <div className="space-y-3">
        <div><p className="text-xs text-app-text-muted mb-1">표시 시간</p>
          <div className="flex gap-2">
            {[
              { v: 2000, l: "2초" }, { v: 4000, l: "4초" }, { v: 6000, l: "6초" },
            ].map(o => (
              <button key={o.v} onClick={() => setDuration(o.v)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${duration === o.v ? "bg-app-primary text-white" : "border border-app-border text-app-text-muted"}`}>{o.l}</button>
            ))}
          </div>
        </div>
        <div><p className="text-xs text-app-text-muted mb-1">표시 위치</p>
          <div className="flex gap-2">
            {[
              { v: "top" as const, l: "상단" },
              { v: "bottom" as const, l: "하단" },
            ].map(o => (
              <button key={o.v} onClick={() => setPosition(o.v)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${position === o.v ? "bg-app-primary text-white" : "border border-app-border text-app-text-muted"}`}>{o.l}</button>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}
