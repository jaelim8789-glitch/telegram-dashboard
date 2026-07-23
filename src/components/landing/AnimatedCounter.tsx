"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";

interface AnimatedCounterProps {
  end: number;
  suffix?: string;
  label: string;
  duration?: number;
  /** If true, show a small progress bar below the number */
  showProgress?: boolean;
  /** Show a sparkle icon when count reaches 100% */
  showSparkleOnComplete?: boolean;
}

export function AnimatedCounter({
  end,
  suffix = "",
  label,
  duration = 2000,
  showProgress = true,
  showSparkleOnComplete = true,
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const startTime = performance.now();

          const tick = (now: number) => {
            const elapsed = now - startTime;
            const rawProgress = Math.min(elapsed / duration, 1);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - rawProgress, 3);
            setCount(Math.floor(eased * end));
            setProgress(Math.round(eased * 100));
            if (rawProgress < 1) {
              requestAnimationFrame(tick);
            } else {
              setCompleted(true);
            }
          };

          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [end, duration]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-3xl sm:text-4xl font-bold gold-text tabular-nums tracking-tight relative inline-block">
        {count}
        {suffix}
        {completed && showSparkleOnComplete && (
          <span className="absolute -top-2 -right-5 text-xs animate-bounce">
            <Sparkles className="h-4 w-4 text-accent" />
          </span>
        )}
      </div>
      <div className="mt-1.5 text-xs text-app-text-muted tracking-wide">{label}</div>
      {showProgress && (
        <div className="mt-2 h-1 w-full max-w-[80%] mx-auto overflow-hidden rounded-full bg-app-border-strong">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-accent-hover transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      {completed && (
        <div className="mt-1 text-[10px] text-app-success font-medium">✓ 완료</div>
      )}
    </div>
  );
}