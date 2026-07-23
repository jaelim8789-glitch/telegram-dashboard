"use client";

import { useEffect, useState } from "react";

interface CountdownTimerProps {
  seconds: number;
}

export function CountdownTimer({ seconds }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(Math.max(0, Math.floor(seconds)));

  useEffect(() => {
    setRemaining(Math.max(0, Math.floor(seconds)));
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [remaining]);

  if (remaining <= 0) return <span className="text-app-success text-xs">다시 시도 가능</span>;

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const display = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;

  return (
    <span className="inline-flex items-center gap-1 text-app-warning text-xs font-mono tabular-nums">
      {display}
    </span>
  );
}
