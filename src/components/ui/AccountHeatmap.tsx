"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Activity, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface AccountHeatmapProps { data: { dayOfWeek: number; hour: number; count: number }[]; }

export function AccountHeatmap({ data }: AccountHeatmapProps) {
  const days = ["월", "화", "수", "목", "금", "토", "일"];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="overflow-x-auto" style={{ scrollbarWidth: "none" }}>
      <div className="flex gap-0.5 min-w-[600px]">
        <div className="flex flex-col gap-0.5 mr-1">
          <div className="h-4" />
          {days.map(d => <div key={d} className="h-3 text-[8px] text-app-text-muted flex items-center">{d}</div>)}
        </div>
        {hours.map(h => (
          <div key={h} className="flex flex-col gap-0.5">
            <div className="h-3 text-[8px] text-app-text-muted text-center">{h % 6 === 0 ? `${h}시` : ""}</div>
            {days.map(d => {
              const found = data.find(item => item.dayOfWeek === days.indexOf(d) && item.hour === h);
              const intensity = found ? Math.min(found.count / maxCount, 1) : 0;
              return (
                <motion.div key={`${d}-${h}`} initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: intensity > 0 ? `rgba(82, 136, 193, ${0.1 + intensity * 0.7})` : "var(--color-border)" }}
                  title={found ? `${d} ${h}시: ${found.count}건` : ""}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
