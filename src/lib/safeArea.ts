export const SAFE_AREA_TOP = "env(safe-area-inset-top, 0px)";
export const SAFE_AREA_BOTTOM = "env(safe-area-inset-bottom, 0px)";
export const SAFE_AREA_LEFT = "env(safe-area-inset-left, 0px)";
export const SAFE_AREA_RIGHT = "env(safe-area-inset-right, 0px)";

export function getSafeAreaStyle(position: "top" | "bottom" | "both"): React.CSSProperties {
  switch (position) {
    case "top": return { paddingTop: `max(0.5rem, ${SAFE_AREA_TOP})` };
    case "bottom": return { paddingBottom: `max(0.5rem, ${SAFE_AREA_BOTTOM})` };
    case "both": return { paddingTop: `max(0.5rem, ${SAFE_AREA_TOP})`, paddingBottom: `max(0.5rem, ${SAFE_AREA_BOTTOM})` };
  }
}

export const safeAreaBottomClass = "safe-area-bottom";
