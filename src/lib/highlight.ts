import { H } from "@highlight-run/react";

export function initHighlight() {
  if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
    H.init(process.env.NEXT_PUBLIC_HIGHLIGHT_PROJECT_ID ?? "");
  }
}
