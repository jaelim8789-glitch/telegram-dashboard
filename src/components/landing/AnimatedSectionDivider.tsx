"use client";

import React, { useEffect, useRef, useState } from "react";

type DividerStyle = "classic" | "minimal" | "spark" | "wave" | "dots";

const STYLES: DividerStyle[] = ["classic", "minimal", "spark", "wave", "dots"];

/* ── Spark Particles ── */
function SparkParticles({ visible }: { visible: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !visible) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const particles: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number }[] = [];
    const spawnCount = 12;

    function spawn() {
      for (let i = 0; i < spawnCount; i++) {
        particles.push({
          x: canvas!.width / 2 + (Math.random() - 0.5) * 60,
          y: canvas!.height / 2 + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 1.5) - 0.5,
          life: 0,
          maxLife: 60 + Math.random() * 40,
          size: 1.5 + Math.random() * 2.5,
        });
      }
    }

    function loop() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.02;
        p.life++;
        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(212, 175, 55, ${alpha * 0.8})`;
        ctx!.fill();
        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
        }
      }
      if (particles.length < 20) spawn();
      animId = requestAnimationFrame(loop);
    }

    // Resize canvas
    function resize() {
      const parent = canvas!.parentElement!;
      canvas!.width = parent.clientWidth;
      canvas!.height = parent.clientHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    spawn();
    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [visible]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 w-full h-full"
    />
  );
}

function ClassicDivider({ visible }: { visible: boolean }) {
  return (
    <div className="relative flex items-center justify-center py-6 sm:py-8">
      <div className="divider-gradient flex-1" />
      <div
        className={`mx-3 flex h-3 w-3 items-center justify-center rounded-full border border-accent-border bg-app-bg transition-all duration-700 ease-out ${
          visible ? "scale-100 opacity-100" : "scale-0 opacity-0"
        }`}
      >
        <div className="h-1.5 w-1.5 rounded-full bg-app-primary/60" />
      </div>
      <div className="divider-gradient flex-1 rotate-180" />
    </div>
  );
}

function MinimalDivider({ visible }: { visible: boolean }) {
  return (
    <div className="flex items-center justify-center py-6 sm:py-8">
      <div
        className={`h-px w-24 rounded-full bg-gradient-to-r from-transparent via-app-text-subtle/30 to-transparent transition-all duration-700 delay-200 ${
          visible ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
        }`}
      />
    </div>
  );
}

function SparkDivider({ visible }: { visible: boolean }) {
  return (
    <div className="relative flex items-center justify-center py-6 sm:py-8 overflow-hidden">
      {/* Spark particles canvas */}
      <div className="absolute inset-0">
        <SparkParticles visible={visible} />
      </div>
      {/* Center dot */}
      <div
        className={`relative z-10 mx-3 flex h-4 w-4 items-center justify-center rounded-full border border-accent-border bg-app-bg transition-all duration-700 ease-out ${
          visible ? "scale-100 opacity-100" : "scale-0 opacity-0"
        }`}
      >
        <div className="h-2 w-2 rounded-full bg-app-primary/60" />
      </div>
    </div>
  );
}

function WaveDivider({ visible }: { visible: boolean }) {
  return (
    <div className="flex items-center justify-center py-6 sm:py-8">
      <div className="flex items-center gap-[3px]">
        {[4, 8, 12, 16, 12, 8, 4].map((h, i) => (
          <div
            key={i}
            className={`w-[2px] rounded-full bg-gradient-to-t from-accent/20 to-accent/50 transition-all duration-700 ${
              visible ? "opacity-100" : "opacity-0"
            }`}
            style={{
              height: `${h}px`,
              transitionDelay: `${i * 60}ms`,
              animation: visible ? `wave-pulse 3s ease-in-out ${i * 0.2}s infinite` : "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function DotsDivider({ visible }: { visible: boolean }) {
  return (
    <div className="flex items-center justify-center py-6 sm:py-8">
      <div className="flex items-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 w-1.5 rounded-full border border-accent-border/20 bg-app-text-subtle/20 transition-all duration-500 ${
              visible ? "scale-100 opacity-100" : "scale-0 opacity-0"
            }`}
            style={{
              transitionDelay: `${i * 80}ms`,
              animation: visible ? `glow-pulse-soft 3s ease-in-out ${i * 0.4}s infinite` : "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}

const DIVIDER_COMPONENTS: Record<DividerStyle, React.FC<{ visible: boolean }>> = {
  classic: ClassicDivider,
  minimal: MinimalDivider,
  spark: SparkDivider,
  wave: WaveDivider,
  dots: DotsDivider,
};

interface Props {
  variant?: DividerStyle;
}

export function AnimatedSectionDivider({ variant }: Props) {
  const dotRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [style, setStyle] = useState<DividerStyle>(variant ?? "classic");

  useEffect(() => {
    if (!variant) {
      setStyle(STYLES[Math.floor(Math.random() * STYLES.length)]);
    } else {
      setStyle(variant);
    }
  }, [variant]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (dotRef.current) observer.observe(dotRef.current);
    return () => observer.disconnect();
  }, []);

  const DividerComponent = DIVIDER_COMPONENTS[style];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8" ref={dotRef}>
      <DividerComponent visible={visible} />
    </div>
  );
}