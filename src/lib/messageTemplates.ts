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
}

const STORAGE_KEY = "telemon-message-templates";
const MAX_TEMPLATES = 20;

function generateId(): string {
  return `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function loadTemplates(): MessageTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t: unknown): t is MessageTemplate =>
        typeof t === "object" && t !== null &&
        typeof (t as MessageTemplate).id === "string" &&
        typeof (t as MessageTemplate).name === "string" &&
        typeof (t as MessageTemplate).content === "string"
    );
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
  };
  templates.unshift(template);
  if (templates.length > MAX_TEMPLATES) templates.length = MAX_TEMPLATES;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch { /* ignore */ }
  return template;
}

export function deleteTemplate(id: string): void {
  const templates = loadTemplates().filter((t) => t.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch { /* ignore */ }
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
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