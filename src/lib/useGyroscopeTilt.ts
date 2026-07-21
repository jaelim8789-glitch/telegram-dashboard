"use client";

import { useEffect, useState } from "react";

interface Tilt {
  rotateX: number;
  rotateY: number;
}

export function useGyroscopeTilt(enabled = true): Tilt {
  const [tilt, setTilt] = useState<Tilt>({ rotateX: 0, rotateY: 0 });

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    function handleOrientation(e: DeviceOrientationEvent) {
      const gamma = e.gamma ?? 0;
      const beta = e.beta ?? 0;
      const rx = Math.max(-10, Math.min(10, (beta - 45) * 0.2));
      const ry = Math.max(-10, Math.min(10, gamma * 0.2));
      setTilt({ rotateX: rx, rotateY: ry });
    }

    window.addEventListener("deviceorientation", handleOrientation, true);
    return () => window.removeEventListener("deviceorientation", handleOrientation, true);
  }, [enabled]);

  return tilt;
}
