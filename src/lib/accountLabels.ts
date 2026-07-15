/**
 * localStorage-based account label (별칭) storage.
 * Operators can assign a memorable label to each account
 * so they don't have to rely on phone numbers alone.
 * Does NOT require any backend changes.
 */
const STORAGE_KEY = "telemon-account-labels";

function loadAll(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) return parsed as Record<string, string>;
    return {};
  } catch {
    return {};
  }
}

function saveAll(labels: Record<string, string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(labels));
  } catch { /* silently ignore */ }
}

export function getAccountLabel(accountId: string): string | null {
  const labels = loadAll();
  return labels[accountId] ?? null;
}

export function getAccountLabels(): Record<string, string> {
  return loadAll();
}

export function setAccountLabel(accountId: string, label: string): void {
  const labels = loadAll();
  const trimmed = label.trim();
  if (trimmed) {
    labels[accountId] = trimmed;
  } else {
    delete labels[accountId];
  }
  saveAll(labels);
}

export function removeAccountLabel(accountId: string): void {
  const labels = loadAll();
  delete labels[accountId];
  saveAll(labels);
}