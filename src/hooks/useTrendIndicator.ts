"use client";

import { useCallback, useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/cn";

export function useTrendIndicator() {
  const [prevValues, setPrevValues] = useState<Record<string, number>>({});

  const getTrend = useCallback((key: string, current: number) => {
    const prev = prevValues[key];
    const trend = prev === undefined ? "neutral" : current > prev ? "up" : current < prev ? "down" : "neutral";
    setPrevValues(p => ({ ...p, [key]: current }));
    return trend;
  }, [prevValues]);

  const TrendIcon = ({ trend, className }: { trend: string; className?: string }) => {
    if (trend === "up") return <TrendingUp className={cn("h-3 w-3 text-emerald-500", className)} />;
    if (trend === "down") return <TrendingDown className={cn("h-3 w-3 text-red-500", className)} />;
    return <Minus className={cn("h-3 w-3 text-app-text-muted", className)} />;
  };

  return { getTrend, TrendIcon };
}
