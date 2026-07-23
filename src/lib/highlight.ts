import { H } from "@highlight-ai/react";

const IS_DEV = typeof process !== "undefined" && process.env.NODE_ENV === "development";

export function initHighlight() {
  if (IS_DEV && process.env.NEXT_PUBLIC_HIGHLIGHT_PROJECT_ID) {
    H.init(process.env.NEXT_PUBLIC_HIGHLIGHT_PROJECT_ID, {
      environment: "development",
      serviceName: "telemon-frontend",
    });
  }
}
