export interface RefreshDiffResult { changed: number; added: number; removed: number; details: string[]; }

function isObject(v: unknown): v is Record<string, unknown> { return typeof v === "object" && v !== null && !Array.isArray(v); }

function deepKeys(a: unknown, b: unknown, path: string, details: string[]): void {
  if (a === b) return;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) details.push(`${path}: length ${a.length} → ${b.length}`);
    const max = Math.max(a.length, b.length);
    for (let i = 0; i < max; i++) { if (i >= a.length) details.push(`${path}[${i}]: added`); else if (i >= b.length) details.push(`${path}[${i}]: removed`); else deepKeys(a[i], b[i], `${path}[${i}]`, details); }
    return;
  }
  if (isObject(a) && isObject(b)) {
    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of allKeys) { if (!(k in a)) details.push(`${path}.${k}: added`); else if (!(k in b)) details.push(`${path}.${k}: removed`); else deepKeys(a[k], b[k], `${path}.${k}`, details); }
    return;
  }
  details.push(`${path}: ${JSON.stringify(a)} → ${JSON.stringify(b)}`);
}

export function computeDiff(oldData: unknown, newData: unknown): RefreshDiffResult {
  const details: string[] = [];
  deepKeys(oldData, newData, "root", details);
  let changed = 0, added = 0, removed = 0;
  for (const d of details) { if (d.endsWith(": added")) added++; else if (d.endsWith(": removed")) removed++; else changed++; }
  return { changed, added, removed, details };
}
