"use client";

import { useState, useEffect } from "react";

export function useOrientation() {
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");

  useEffect(() => {
    function detect() {
      setOrientation(window.innerWidth > window.innerHeight ? "landscape" : "portrait");
    }
    detect();
    window.addEventListener("resize", detect);
    window.addEventListener("orientationchange", () => setTimeout(detect, 200));
    return () => {
      window.removeEventListener("resize", detect);
      window.removeEventListener("orientationchange", detect);
    };
  }, []);

  return orientation;
}
