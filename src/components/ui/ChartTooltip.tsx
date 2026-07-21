"use client";

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
  dataKey: string;
}

export function ChartTooltip({
  active, payload, label,
  formatter,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  formatter?: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum, p) => sum + (p.value ?? 0), 0);
  return (
    <div
      className="rounded-xl border border-app-border bg-app-surface px-3 py-2 shadow-xl min-w-[130px]"
      role="tooltip"
      style={{ touchAction: "auto" }}
    >
      <p className="text-xs font-medium text-app-text mb-1">{label}</p>
      <div className="space-y-1">
        {payload.map((p) => (
          <div key={p.name} className="flex items-center gap-2 text-[11px]">
            <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: p.color }} />
            <span className="text-app-text-muted capitalize">{p.name}</span>
            <span className="font-medium tabular-nums text-app-text ml-auto">
              {formatter ? formatter(p.value ?? 0) : (p.value?.toLocaleString() ?? 0)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 pt-1.5 border-t border-app-border flex items-center justify-between text-[11px]">
        <span className="text-app-text-muted">합계</span>
        <span className="font-semibold tabular-nums text-app-text">
          {formatter ? formatter(total) : total.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
