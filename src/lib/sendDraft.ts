/**
 * Lightweight localStorage draft persistence for SendTab.
 *
 * Persists only safe, serializable fields.
 * Uses a versioned storage key: telemon-send-draft-v1
 *
 * Not persisted:
 *  - File objects (sendImageFile)
 *  - Secrets / API keys / auth data
 *  - Submission / loading / error state
 */

export interface SendDraft {
  savedAt: string;
  selectedAccountId: string | null;
  selectedGroupIds: string[];
  message: string;
  isScheduled: boolean;
  scheduledAtLocal: string;
  isRecurring: boolean;
  recurringInterval: number;
  deliveryMode?: "normal" | "bulk" | "replyMacro";
  replyMacroEnabled?: boolean;
  replyToMessageId?: string;
}

const STORAGE_KEY = "telemon-send-draft-v1";
const VERSION = 1;

interface PersistedPayload {
  version: typeof VERSION;
  draft: SendDraft;
}

export function saveSendDraft(draft: SendDraft): void {
  try {
    const payload: PersistedPayload = {
      version: VERSION,
      draft: { ...draft, savedAt: new Date().toISOString() },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage full or unavailable – silently ignore.
  }
}

export function loadSendDraft(): SendDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedPayload;
    if (!parsed || parsed.version !== VERSION || !parsed.draft) return null;
    const d = parsed.draft;
    // Validate shape – discard if critical fields are missing or wrong type.
    if (typeof d.message !== "string") return null;
    if (!Array.isArray(d.selectedGroupIds)) return null;
    if (typeof d.isScheduled !== "boolean") return null;
    if (typeof d.isRecurring !== "boolean") return null;
    return d;
  } catch {
    // Malformed JSON – clear and return null.
    clearSendDraft();
    return null;
  }
}

export function clearSendDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silently ignore.
  }
}