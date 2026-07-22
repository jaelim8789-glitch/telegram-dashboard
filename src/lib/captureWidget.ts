"use client";

let toBlobFn: ((element: HTMLElement, options?: Record<string, unknown>) => Promise<Blob>) | null = null;

async function ensureToBlob(): Promise<(element: HTMLElement, options?: Record<string, unknown>) => Promise<Blob>> {
  if (!toBlobFn) { const mod = await import("html-to-image"); toBlobFn = mod.toBlob; }
  return toBlobFn!;
}

export async function captureElement(elementRef: React.RefObject<HTMLElement>): Promise<Blob> {
  const el = elementRef.current;
  if (!el) throw new Error("Element ref is not attached");
  const toBlob = await ensureToBlob();
  return toBlob(el, { quality: 0.92, pixelRatio: 2, backgroundColor: getComputedStyle(el).backgroundColor || "#ffffff" });
}

export async function shareImage(blob: Blob, title?: string): Promise<void> {
  if (typeof navigator !== "undefined" && "share" in navigator && typeof navigator.canShare === "function") {
    const file = new File([blob], "widget.png", { type: "image/png" });
    if (navigator.canShare({ files: [file] })) { await navigator.share({ title: title || "TeleMon 위젯", files: [file] }); return; }
  }
  downloadImage(blob, "widget.png");
}

export function downloadImage(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
