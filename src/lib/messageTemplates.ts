/**
 * Message template library with variable substitution.
 *
 * Templates are stored in localStorage and support variables like:
 *   {{name}}   → recipient group/channel name
 *   {{phone}}  → sender account phone number
 *   {{count}}  → number of recipients
 *
 * Variables are resolved at send time by the caller.
 */

export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isFavorite?: boolean;
}

const STORAGE_KEY = "telemon-message-templates";
const FAVORITES_KEY = "telemon-template-favorites";
const MAX_TEMPLATES = 20;

function generateId(): string {
  return `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function loadFavoriteIds(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((f): f is string => typeof f === "string") : []);
  } catch {
    return new Set();
  }
}

function saveFavoriteIds(favorites: Set<string>): void {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
  } catch { /* ignore */ }
}

export function toggleTemplateFavorite(id: string): boolean {
  const favorites = loadFavoriteIds();
  if (favorites.has(id)) {
    favorites.delete(id);
    saveFavoriteIds(favorites);
    return false;
  } else {
    favorites.add(id);
    saveFavoriteIds(favorites);
    return true;
  }
}

export function loadTemplates(): MessageTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const favorites = loadFavoriteIds();
    return parsed.filter(
      (t: unknown): t is MessageTemplate =>
        typeof t === "object" && t !== null &&
        typeof (t as MessageTemplate).id === "string" &&
        typeof (t as MessageTemplate).name === "string" &&
        typeof (t as MessageTemplate).content === "string"
    ).map((t) => ({ ...t, isFavorite: favorites.has(t.id) }));
  } catch {
    return [];
  }
}

export function saveTemplate(name: string, content: string): MessageTemplate {
  const templates = loadTemplates();
  const now = new Date().toISOString();
  const template: MessageTemplate = {
    id: generateId(),
    name: name.trim(),
    content,
    createdAt: now,
    updatedAt: now,
    isFavorite: false,
  };
  templates.unshift(template);
  if (templates.length > MAX_TEMPLATES) templates.length = MAX_TEMPLATES;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates.map(({ isFavorite, ...rest }) => rest)));
  } catch { /* ignore */ }
  return template;
}

export function deleteTemplate(id: string): void {
  const templates = loadTemplates().filter((t) => t.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates.map(({ isFavorite, ...rest }) => rest)));
  } catch { /* ignore */ }
  // Clean up favorite reference if exists
  const favorites = loadFavoriteIds();
  if (favorites.has(id)) {
    favorites.delete(id);
    saveFavoriteIds(favorites);
  }
}

export function updateTemplate(id: string, updates: Partial<Pick<MessageTemplate, "name" | "content">>): MessageTemplate | null {
  const templates = loadTemplates();
  const idx = templates.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const updated = {
    ...templates[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  templates[idx] = updated;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates.map(({ isFavorite, ...rest }) => rest)));
  } catch { /* ignore */ }
  return updated;
}

/**
 * Available template variables and their descriptions.
 */
export const TEMPLATE_VARIABLES: { key: string; label: string; description: string }[] = [
  { key: "{{name}}", label: "받는 사람 이름", description: "그룹/채널 이름으로 치환됩니다." },
  { key: "{{phone}}", label: "발신자 전화번호", description: "선택한 계정의 전화번호로 치환됩니다." },
  { key: "{{count}}", label: "수신자 수", description: "선택한 수신자 총 개수로 치환됩니다." },
];

/**
 * Preview a template by substituting variables with sample values.
 */
export function previewTemplate(
  content: string,
  vars: { name?: string; phone?: string; count?: number },
): string {
  return content
    .replace(/\{\{name\}\}/g, vars.name ?? "[이름]")
    .replace(/\{\{phone\}\}/g, vars.phone ?? "[전화번호]")
    .replace(/\{\{count\}\}/g, vars.count != null ? String(vars.count) : "[수]");
}