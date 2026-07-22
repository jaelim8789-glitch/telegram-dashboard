interface DiffResult {
  changed: boolean;
  added: number;
  removed: number;
  details: Record<string, { oldValue: unknown; newValue: unknown }>;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function deepDiff(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
  prefix = ""
): Record<string, { oldValue: unknown; newValue: unknown }> {
  const details: Record<string, { oldValue: unknown; newValue: unknown }> = {};
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  for (const key of allKeys) {
    const path = prefix ? `${prefix}.${key}` : key;
    const oldVal = oldObj[key];
    const newVal = newObj[key];

    if (key in oldObj && !(key in newObj)) {
      details[path] = { oldValue: oldVal, newValue: undefined };
    } else if (!(key in oldObj) && key in newObj) {
      details[path] = { oldValue: undefined, newValue: newVal };
    } else if (isObject(oldVal) && isObject(newVal)) {
      Object.assign(details, deepDiff(oldVal, newVal, path));
    } else if (oldVal !== newVal) {
      details[path] = { oldValue: oldVal, newValue: newVal };
    }
  }

  return details;
}

export function computeDiff(
  oldData: unknown,
  newData: unknown
): DiffResult {
  if (!isObject(oldData) || !isObject(newData)) {
    return {
      changed: oldData !== newData,
      added: 0,
      removed: 0,
      details: oldData !== newData ? { _root: { oldValue: oldData, newValue: newData } } : {},
    };
  }

  const details = deepDiff(oldData, newData);
  const added = Object.values(details).filter((d) => d.oldValue === undefined).length;
  const removed = Object.values(details).filter((d) => d.newValue === undefined).length;

  return {
    changed: Object.keys(details).length > 0,
    added,
    removed,
    details,
  };
}
