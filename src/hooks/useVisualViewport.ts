"use client";

import { useEffect, useRef, useState } from "react";

interface VisualViewportState {
  height: number;
  width: number;
  offsetTop: number;
  isKeyboardVisible: boolean;
}

function getScrollParent(el: HTMLElement): HTMLElement | null {
  let parent = el.parentElement;
  while (parent) {
    const style = getComputedStyle(parent);
    if (
      style.overflowY === "auto" ||
      style.overflowY === "scroll" ||
      style.overflow === "auto" ||
      style.overflow === "scroll"
    ) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}

export function useVisualViewport(): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>(() => ({
    height: typeof window !== "undefined" ? window.innerHeight : 0,
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    offsetTop: 0,
    isKeyboardVisible: false,
  }));

  const vvRef = useRef<VisualViewport | null>(null);
  const previousKeyboardRef = useRef(false);

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

      if (keyboardVisible && !previousKeyboardRef.current) {
        const el = document.activeElement;
        if (el instanceof HTMLElement) {
          const scrollParent = getScrollParent(el);
          if (scrollParent) {
            const elRect = el.getBoundingClientRect();
            const parentRect = scrollParent.getBoundingClientRect();
            if (elRect.bottom > parentRect.bottom - 20) {
              el.scrollIntoView({ block: "nearest", behavior: "smooth" });
            }
          } else {
            el.scrollIntoView({ block: "center", behavior: "smooth" });
          }
        }
      }
      if (!keyboardVisible) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      previousKeyboardRef.current = keyboardVisible;
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
