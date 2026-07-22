"use client";

import { useEffect, useState } from "react";

export function useWidgetSimplification() {
  const [state, setState] = useState(() => {
    if (typeof window === "undefined") return { compact: false, isTiny: false };
    return { compact: window.innerWidth < 480, isTiny: window.innerWidth < 360 };
  });

  useEffect(() => {
    const handleResize = () => setState({ compact: window.innerWidth < 480, isTiny: window.innerWidth < 360 });
    window.addEventListener("resize", handleResize, { passive: true });
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return state;
}
