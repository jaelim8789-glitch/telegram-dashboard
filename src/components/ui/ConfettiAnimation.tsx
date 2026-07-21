"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfettiProps {
  active: boolean;
  duration?: number;
}

const COLORS = ["#bfa260", "#22c55e", "#38bdf8", "#a855f7", "#f43f5e", "#f97316"];
const SHAPES = ["circle", "square", "star"];

/**
 * Confetti animation — 발송 완료/업그레이드 성공 시 파티클
 */
export function ConfettiAnimation({ active, duration = 3000 }: ConfettiProps) {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string; shape: string; size: number; delay: number }[]>([]);

  useEffect(() => {
    if (!active) { setParticles([]); return; }
    const items = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10 - Math.random() * 20,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      size: 4 + Math.random() * 8,
      delay: Math.random() * 0.5,
    }));
    setParticles(items);
    const t = setTimeout(() => setParticles([]), duration);
    return () => clearTimeout(t);
  }, [active, duration]);

  return (
    <AnimatePresence>
      {particles.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ x: `${p.x}vw`, y: `${p.y}vh`, rotate: 0, opacity: 1 }}
              animate={{ y: "110vh", rotate: 720, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2 + Math.random(), delay: p.delay, ease: "easeIn" }}
              className="absolute"
              style={{
                width: p.size,
                height: p.size,
                backgroundColor: p.shape === "star" ? "transparent" : p.color,
                borderRadius: p.shape === "circle" ? "50%" : p.shape === "star" ? "0" : "2px",
                borderLeft: p.shape === "star" ? `${p.size / 2}px solid transparent` : "none",
                borderRight: p.shape === "star" ? `${p.size / 2}px solid transparent` : "none",
                borderBottom: p.shape === "star" ? `${p.size}px solid ${p.color}` : "none",
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
