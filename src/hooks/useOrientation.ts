"use client";

import { useCallback, useEffect, useState } from "react";

type Orientation = "portrait" | "landscape";

interface OrientationState {
  orientation: Orientation;
  angle: number;
  isSupported: boolean;
}

export function useOrientation(): OrientationState {
  const [state, setState] = useState<OrientationState>(() => {
    if (typeof window === "undefined") {
      return { orientation: "portrait", angle: 0, isSupported: false };
    }
    const angle = screen.orientation?.angle ?? 0;
    return {
      orientation: angle === 0 || angle === 180 ? "portrait" : "landscape",
      angle,
      isSupported: "orientation" in screen,
    };
  });

  const handleChange = useCallback(() => {
    const angle = screen.orientation?.angle ?? 0;
    setState({
      orientation: angle === 0 || angle === 180 ? "portrait" : "landscape",
      angle,
      isSupported: true,
    });
  }, []);

  useEffect(() => {
    const orientation = screen.orientation;
    if (!orientation) return;

    orientation.addEventListener("change", handleChange);
    return () => orientation.removeEventListener("change", handleChange);
  }, [handleChange]);

  return state;
}
