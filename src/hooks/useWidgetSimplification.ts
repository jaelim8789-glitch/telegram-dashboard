"use client";

import { useEffect, useState } from "react";

interface WidgetSimplification {
  compact: boolean;
  isTiny: boolean;
}

export function useWidgetSimplification(): WidgetSimplification {
  const [state, setState] = useState<WidgetSimplification>(() => ({
    compact: typeof window !== "undefined" && window.innerWidth < 480,
    isTiny: typeof window !== "undefined" && window.innerWidth < 360,
  }));

  useEffect(() => {
    function update() {
      setState({
        compact: window.innerWidth < 480,
        isTiny: window.innerWidth < 360,
      });
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return state;
}
