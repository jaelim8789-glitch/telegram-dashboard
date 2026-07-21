"use client";

import { useEffect, useRef, useState } from "react";

interface VisualViewportState {
  height: number;
  width: number;
  offsetTop: number;
  isKeyboardVisible: boolean;
}

export function useVisualViewport(): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>(() => ({
    height: typeof window !== "undefined" ? window.innerHeight : 0,
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    offsetTop: 0,
    isKeyboardVisible: false,
  }));

  const vvRef = useRef<VisualViewport | null>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    vvRef.current = vv;

    function handleResize() {
      const current = vvRef.current;
      if (!current) return;
      const keyboardVisible = window.innerHeight - current.height > 100;
      setState({
        height: current.height,
        width: current.width,
        offsetTop: current.offsetTop,
        isKeyboardVisible: keyboardVisible,
      });

      if (keyboardVisible && document.activeElement instanceof HTMLElement) {
        document.activeElement.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }

    vv.addEventListener("resize", handleResize);
    vv.addEventListener("scroll", handleResize);
    handleResize();
    return () => {
      vv.removeEventListener("resize", handleResize);
      vv.removeEventListener("scroll", handleResize);
      vvRef.current = null;
    };
  }, []);

  return state;
}
