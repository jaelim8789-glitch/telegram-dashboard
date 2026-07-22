"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";

export async function captureElement(ref: React.RefObject<HTMLElement | null>): Promise<Blob | null> {
  if (!ref.current) return null;
  try {
    const dataUrl = await toPng(ref.current, { quality: 0.95, pixelRatio: 2 });
    const res = await fetch(dataUrl);
    return res.blob();
  } catch {
    return null;
  }
}

export async function shareImage(blob: Blob): Promise<void> {
  if (!navigator.share) return;
  try {
    await navigator.share({
      files: [new File([blob], "dashboard.png", { type: "image/png" })],
      title: "TeleMon Dashboard",
    });
  } catch {}
}

export async function downloadImage(blob: Blob, filename = "dashboard.png"): Promise<void> {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
