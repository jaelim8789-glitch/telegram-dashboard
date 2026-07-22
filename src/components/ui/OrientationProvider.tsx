"use client";

import { useEffect, useState, createContext, useContext, type ReactNode } from "react";

interface OrientationContextType { landscape: boolean; angle: number; }
const OrientationContext = createContext<OrientationContextType>({ landscape: false, angle: 0 });
export const useOrientation = () => useContext(OrientationContext);

export function OrientationProvider({ children }: { children: ReactNode }) {
  const [landscape, setLandscape] = useState(false);
  const [angle, setAngle] = useState(0);

  useEffect(() => {
    function check() {
      const w = window.innerWidth, h = window.innerHeight;
      setLandscape(w > h && h < 500);
      setAngle(window.screen?.orientation?.angle ?? 0);
    }
    check();
    window.addEventListener("resize", check);
    window.screen?.orientation?.addEventListener("change", check);
    return () => { window.removeEventListener("resize", check); window.screen?.orientation?.removeEventListener("change", check); };
  }, []);

  return <OrientationContext.Provider value={{ landscape, angle }}>{children}</OrientationContext.Provider>;
}
