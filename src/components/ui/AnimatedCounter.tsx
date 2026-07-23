"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { motion } from "framer-motion";

export function AnimatedCounter({ value, format = (v: number) => String(v) }: { value: number; format?: (v: number) => string }) {
  const [display, setDisplay] = useState(value);
  const [direction, setDirection] = useState<"up" | "down">("up");
  const prev = useRef(value);

  useEffect(() => {
    if (value !== prev.current) { setDirection(value > prev.current ? "up" : "down"); prev.current = value; }
    const diff = value - display;
    if (diff === 0) return;
    const step = Math.sign(diff) * Math.max(1, Math.ceil(Math.abs(diff) / 10));
    const timer = setTimeout(() => setDisplay(d => d + step), 30);
    return () => clearTimeout(timer);
  }, [value, display]);

  return (
    <motion.span key={value} initial={{ y: direction === "up" ? 12 : -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.2 }} className="tabular-nums inline-block">
      {format(display)}
    </motion.span>
  );
}
