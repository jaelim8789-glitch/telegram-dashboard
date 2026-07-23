import { aiChat } from "./ai-chat";
import { translationSystemPrompt } from "./translation-prompt";

interface TranslationResult {
  detectedLang: string;
  translated: string;
  original: string;
}

const cache = new Map<string, TranslationResult>();

function cacheKey(text: string, targetLang?: string): string {
  return `${targetLang ?? "ko"}::${text}`;
}

export async function translate(
  text: string,
  targetLang?: string,
): Promise<TranslationResult> {
  if (!text.trim()) {
    return { detectedLang: "unknown", translated: "", original: text };
  }

  const key = cacheKey(text, targetLang);
  const cached = cache.get(key);
  if (cached) return cached;

  const payload = targetLang
    ? `다음 텍스트를 번역하세요. 목표 언어 코드: ${targetLang}\n\n${text}`
    : `다음 텍스트를 분석하고 번역하세요:\n\n${text}`;

  try {
    const response = await aiChat({
      messages: [
        { role: "system", content: translationSystemPrompt },
        { role: "user", content: payload },
      ],
      stream: false,
    });

    const cleaned = response.content
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    const result: TranslationResult = JSON.parse(cleaned);
    cache.set(key, result);
    return result;
  } catch {
    return { detectedLang: "unknown", translated: text, original: text };
  }
}

export async function detectLanguage(text: string): Promise<string> {
  try {
    const result = await translate(text.slice(0, 200));
    return result.detectedLang || "en";
  } catch {
    return "en";
  }
}

export function clearTranslationCache() {
  cache.clear();
}
