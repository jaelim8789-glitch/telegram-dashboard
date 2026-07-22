"use client";

import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  change: number;
  positive: boolean;
  icon: LucideIcon;
}

function extractNumeric(raw: string): { prefix: string; num: number; suffix: string; formatted: (n: number) => string } {
  const numericMatch = raw.replace(/,/g, "").match(/^([^0-9]*)([\d.]+)([^0-9]*)$/);
  if (!numericMatch) return { prefix: "", num: 0, suffix: raw, formatted: () => raw };
  const num = parseFloat(numericMatch[2]);
  const prefix = raw.startsWith(numericMatch[1]) ? numericMatch[1] : "";
  const suffix = raw.endsWith(numericMatch[3]) ? numericMatch[3] : "";
  const hasComma = raw.includes(",");
  const decimals = (numericMatch[2].split(".")[1] || "").length;
  return {
    prefix,
    num,
    suffix,
    formatted: (n: number) => {
      if (hasComma) return `${prefix}${n.toLocaleString()}${suffix}`;
      return `${prefix}${n.toFixed(decimals)}${suffix}`;
    },
  };
}

export function StatCard({ label, value, change, positive, icon: Icon }: StatCardProps) {
  const { num, formatted } = extractNumeric(value);
  const spring = useSpring(0, { stiffness: 80, damping: 20, duration: 800 });
  const rounded = useTransform(spring, (latest: number) => Math.round(latest));
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    spring.set(num);
  }, [num, spring]);

  useEffect(() => {
    const unsubscribe = rounded.on("change", (latest: number) => {
      setDisplay(formatted(latest));
    });
    return unsubscribe;
  }, [rounded, formatted]);

  return (
    <motion.div
      className="rounded-2xl border border-violet-500/15 bg-app-card p-5 backdrop-blur cursor-default hover:shadow-lg hover:shadow-purple-500/10"
      whileHover={{ y: -2, boxShadow: "0 10px 25px -5px rgba(139,92,246,0.1)" }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-app-text-muted">{label}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
          <Icon className="h-4 w-4 text-violet-400" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-app-text tabular-nums">{display}</span>
        <span
          className={`inline-flex items-center gap-0.5 text-xs font-medium tabular-nums ${
            positive ? "text-green-400" : "text-red-400"
          }`}
        >
          {positive ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {positive ? "+" : "-"}
          {change}%
        </span>
      </div>
    </motion.div>
  );
}
