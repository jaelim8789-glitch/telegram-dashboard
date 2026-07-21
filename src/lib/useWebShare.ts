"use client";

import { useCallback } from "react";

interface ShareFile {
  /** File blob to share (e.g. canvas.toBlob(), fetch blob). */
  blob: Blob;
  /** File name including extension (e.g. "report.png"). */
  name: string;
}

interface ShareData {
  title?: string;
  text?: string;
  url?: string;
  /** Optional files to attach (mobile share sheet). */
  files?: ShareFile[];
}

export function useWebShare() {
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  const canShareFiles =
    canShare &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [new File([], "")] });

  const share = useCallback(
    async (data: ShareData) => {
      if (!canShare) {
        // Fallback: copy URL to clipboard
        const textToCopy = data.url || data.text || window.location.href;
        try {
          await navigator.clipboard.writeText(textToCopy);
        } catch {
          /* silent fail */
        }
        return false;
      }

      try {
        const shareData: ShareData = {
          title: data.title,
          text: data.text,
          url: data.url,
        };

        // Attach files if supported and provided
        if (data.files && data.files.length > 0 && canShareFiles) {
          const fileObjects = data.files.map(
            (f) => new File([f.blob], f.name, { type: f.blob.type })
          );
          const testData = { files: fileObjects };
          if (navigator.canShare(testData)) {
            (shareData as any).files = fileObjects;
          }
        }

        await navigator.share(shareData as any);
        return true;
      } catch {
        return false;
      }
    },
    [canShare, canShareFiles]
  );

  /** Capture a DOM element (ref) as PNG and share it. Requires `html-to-image` installed. */
  const shareElementAsImage = useCallback(
    async (
      element: HTMLElement,
      filename = "share.png",
      opts?: { title?: string; text?: string }
    ) => {
      try {
        // Lazy-load html-to-image only when this function is called
        const { toPng } = await import("html-to-image");
        const blob = await toPng(element, {
          quality: 0.92,
          pixelRatio: 2,
          backgroundColor: getComputedStyle(element).backgroundColor || "#f5f0e8",
        }).then((dataUrl: string) => fetch(dataUrl).then((r: Response) => r.blob()));

        return share({
          title: opts?.title,
          text: opts?.text,
          files: [{ blob, name: filename }],
        });
      } catch {
        // Fallback: just share the URL
        return share({ title: opts?.title, text: opts?.text, url: window.location.href });
      }
    },
    [share]
  );

  return { share, canShare, canShareFiles, shareElementAsImage };
}
