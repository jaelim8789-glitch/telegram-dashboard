import { useState } from "react";
export function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null;
  return React.createElement("div", { className: "rounded-lg border bg-app-card p-2 text-xs shadow-lg" }, React.createElement("p", null, label), payload.map((p: any, i: number) => React.createElement("p", { key: i, style: { color: p.color } }, `${p.name}: ${p.value}`)));
}