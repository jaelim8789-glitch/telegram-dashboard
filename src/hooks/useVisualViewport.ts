"use client";

import { useEffect, useRef, useState } from "react";

interface VisualViewportState {
  height: number;
  width: number;
  offsetTop: number;
  isKeyboardVisible: boolean;
  isAddressBarCollapsed: boolean;
}

let previousHeight = typeof window !== "undefined" ? window.innerHeight : 0;

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

function isLikelyMobileSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/Chrome/.test(ua);
}

export function useVisualViewport(): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>(() => ({
    height: typeof window !== "undefined" ? window.innerHeight : 0,
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    offsetTop: 0,
    isKeyboardVisible: false,
    isAddressBarCollapsed: false,
  }));

  const vvRef = useRef<VisualViewport | null>(null);
  const previousKeyboardRef = useRef(false);
  const stableScrollParentRef = useRef<HTMLElement | null>(null);
  const orientationRef = useRef(screen.orientation?.angle ?? 0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    vvRef.current = vv;
    previousHeight = window.innerHeight;

    function handleResize() {
      const current = vvRef.current;
      if (!current) return;

      const windowHeight = window.innerHeight;
      const vvHeight = current.height;
      const heightDiff = windowHeight - vvHeight;

      // iOS Safari: keyboard when diff > 100, address bar collapse when diff < ~60
      const keyboardVisible = heightDiff > 100;
      const addressBarCollapsed = heightDiff <= 60 && heightDiff > 0;

      // Detect orientation change to reset scroll
      const currentOrientation = screen.orientation?.angle ?? 0;
      const orientationChanged = currentOrientation !== orientationRef.current;
      orientationRef.current = currentOrientation;

      setState({
        height: vvHeight,
        width: current.width,
        offsetTop: current.offsetTop,
        isKeyboardVisible: keyboardVisible,
        isAddressBarCollapsed: addressBarCollapsed,
      });

      // Handle keyboard appearance — scroll active element into view
      if (keyboardVisible && !previousKeyboardRef.current) {
        const el = document.activeElement;
        if (el instanceof HTMLElement) {
          // Cache the scroll parent for performance
          if (!stableScrollParentRef.current) {
            stableScrollParentRef.current = getScrollParent(el);
          }
          const scrollParent = stableScrollParentRef.current;
          if (scrollParent) {
            const elRect = el.getBoundingClientRect();
            const parentRect = scrollParent.getBoundingClientRect();
            if (elRect.bottom > parentRect.bottom - 20) {
              el.scrollIntoView({ block: "nearest", behavior: "smooth" });
            }
          } else {
            // Use visualViewport-relative scroll on iOS
            const targetY = el.getBoundingClientRect().top - 20;
            if (targetY < 0 || targetY > vvHeight * 0.5) {
              window.scrollTo({ top: window.scrollY + targetY - 60, behavior: "smooth" });
            }
          }
        }
      }

      // Handle keyboard dismissal — smooth scroll to top
      if (!keyboardVisible && previousKeyboardRef.current) {
        if (isLikelyMobileSafari() && !orientationChanged) {
          // iOS: wait a tick for the keyboard to fully dismiss
          requestAnimationFrame(() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
          });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        stableScrollParentRef.current = null;
      }


      previousKeyboardRef.current = keyboardVisible;
      previousHeight = vvHeight;
    }

    // Also listen for orientation change to reset scroll positions
    function handleOrientationChange() {
      stableScrollParentRef.current = null;
      // Reset scroll on orientation change
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 300);
    }

    vv.addEventListener("resize", handleResize);
    vv.addEventListener("scroll", handleResize);
    window.addEventListener("orientationchange", handleOrientationChange);

    // Initial call
    handleResize();

    return () => {
      vv.removeEventListener("resize", handleResize);
      vv.removeEventListener("scroll", handleResize);
      window.removeEventListener("orientationchange", handleOrientationChange);
      vvRef.current = null;
      document.documentElement.style.removeProperty("--safe-area-bottom-dynamic");
    };
  }, []);

  return state;
}
