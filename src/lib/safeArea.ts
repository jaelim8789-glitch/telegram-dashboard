export const SAFE_AREA_TOP = "env(safe-area-inset-top, 0px)";
export const SAFE_AREA_BOTTOM = "env(safe-area-inset-bottom, 0px)";
export const SAFE_AREA_LEFT = "env(safe-area-inset-left, 0px)";
export const SAFE_AREA_RIGHT = "env(safe-area-inset-right, 0px)";

const positionMap: Record<string, string> = {
  top: `top: ${SAFE_AREA_TOP};`,
  bottom: `bottom: ${SAFE_AREA_BOTTOM};`,
  left: `left: ${SAFE_AREA_LEFT};`,
  right: `right: ${SAFE_AREA_RIGHT};`,
  "top-left": `top: ${SAFE_AREA_TOP}; left: ${SAFE_AREA_LEFT};`,
  "top-right": `top: ${SAFE_AREA_TOP}; right: ${SAFE_AREA_RIGHT};`,
  "bottom-left": `bottom: ${SAFE_AREA_BOTTOM}; left: ${SAFE_AREA_LEFT};`,
  "bottom-right": `bottom: ${SAFE_AREA_BOTTOM}; right: ${SAFE_AREA_RIGHT};`,
};

export function getSafeAreaStyle(position: string): React.CSSProperties {
  if (positionMap[position]) {
    const entries = positionMap[position].split(";").filter(Boolean).map((s) => s.trim().split(": "));
    return Object.fromEntries(entries.map(([k, v]) => [k.trim(), v.trim()])) as React.CSSProperties;
  }
  return {};
}

export const safeAreaBottomClass = "pb-[env(safe-area-inset-bottom,0px)]";
