"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const START_WIDTH = 10;
const INCREMENT_MIN = 8;
const INCREMENT_MAX = 25;
const TICK_MS = 200;

export function PageTransitionBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    setVisible(true);
    setWidth(START_WIDTH);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setWidth((prev) => {
        const increment = Math.random() * (INCREMENT_MAX - INCREMENT_MIN) + INCREMENT_MIN;
        const next = prev + increment;
        if (next >= 90) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 90;
        }
        return next;
      });
    }, TICK_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pathname, searchParams]);

  useEffect(() => {
    if (width === 90) {
      const tid = setTimeout(() => setWidth(98), 300);
      const tid2 = setTimeout(() => {
        setWidth(100);
        const tid3 = setTimeout(() => {
          setVisible(false);
          setWidth(0);
        }, 200);
        return () => clearTimeout(tid3);
      }, 450);
      return () => {
        clearTimeout(tid);
        clearTimeout(tid2);
      };
    }
  }, [width]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 z-[9999] h-[2px] transition-[width] duration-150 ease-out"
      style={{
        width: `${width}%`,
        background: "linear-gradient(90deg, #8B5CF6, #3B82F6, #A78BFA)",
      }}
      aria-hidden="true"
    />
  );
}
