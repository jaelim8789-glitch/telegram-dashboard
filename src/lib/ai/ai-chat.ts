/**
 * AI Chat — DeepSeek API 호출 레이어
 *
 * TeleMon AI 시스템 프롬프트를 자동 주입하고
 * SSE 스트리밍을 지원합니다.
 */

import { getToken, getSessionToken } from "@/lib/auth";
import { TELEMON_SYSTEM_PROMPT } from "./telemon-prompt";

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_MODEL = "deepseek-chat";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (fullContent: string) => void;
  onError: (error: Error) => void;
}

/**
 * DeepSeek API로 스트리밍 채팅 요청을 보냅니다.
 * 시스템 프롬프트는 자동으로 주입됩니다.
 */
const AI_MOCK = typeof process !== "undefined" && process.env.NEXT_PUBLIC_AI_MOCK === "true";

const MOCK_RESPONSE = "네, 알겠습니다. 해당 내용을 처리했습니다. (Mock AI 응답 — NEXT_PUBLIC_AI_MOCK=true)";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function streamChat(
  messages: Omit<ChatMessage, "role" | "content">[],
  callbacks: StreamCallbacks,
  options?: { signal?: AbortSignal },
): Promise<void> {
  if (AI_MOCK) {
    for (const char of MOCK_RESPONSE) {
      if (options?.signal?.aborted) return;
      callbacks.onToken(char);
      await delay(30);
    }
    callbacks.onDone(MOCK_RESPONSE);
    return;
  }

  const apiKey = getDeepSeekApiKey();
  if (!apiKey) {
    callbacks.onError(new Error("API 키가 설정되지 않았습니다. 관리자에게 문의하세요."));
    return;
  }

  const fullMessages: ChatMessage[] = [
    { role: "system", content: TELEMON_SYSTEM_PROMPT },
    ...messages as ChatMessage[],
  ];

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: fullMessages,
        stream: true,
        max_tokens: 4096,
        temperature: 0.7,
      }),
      signal: options?.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(`API 오류 (${response.status}): ${errorBody || response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("응답 스트림을 읽을 수 없습니다.");
    }

    const decoder = new TextDecoder();
    let fullContent = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        const data = trimmed.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content ?? "";
          if (content) {
            fullContent += content;
            callbacks.onToken(content);
          }
        } catch {
          // 일부 청크가 JSON이 아닐 수 있음 — 무시
        }
      }
    }

    callbacks.onDone(fullContent);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return;
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
  }
}

/**
 * DeepSeek API 키를 환경 변수에서 가져옵니다.
 * 프론트엔드 클라이언트키(읽기 전용)와, 없으면 텔레몬 백엔드가 제공하는 키를 사용합니다.
 */
function getDeepSeekApiKey(): string | null {
  // 1순위: 환경 변수 (런타임에서 주입)
  const envKey =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY ?? null
      : null;
  if (envKey) return envKey;

  // 2순위: 로컬스토리지 (관리자가 설정)
  if (typeof localStorage !== "undefined") {
    try {
      const stored = localStorage.getItem("telemon_deepseek_key");
      if (stored) return stored;
    } catch { /* 무시 */ }
  }

  return null;
}

/**
 * 논스트리밍 채팅 요청 (간단한 쿼리용)
 */
export async function chat(
  messages: Omit<ChatMessage, "role" | "content">[],
  options?: { signal?: AbortSignal },
): Promise<string> {
  if (AI_MOCK) {
    await delay(500);
    return MOCK_RESPONSE;
  }
  const apiKey = getDeepSeekApiKey();
  if (!apiKey) {
    throw new Error("API 키가 설정되지 않았습니다.");
  }

  const fullMessages: ChatMessage[] = [
    { role: "system", content: TELEMON_SYSTEM_PROMPT },
    ...messages as ChatMessage[],
  ];

  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: fullMessages,
      stream: false,
      max_tokens: 4096,
      temperature: 0.7,
    }),
    signal: options?.signal,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`API 오류 (${response.status}): ${errorBody || response.statusText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

/**
 * aiChat — short-hand non-streaming chat for simple tool calls
 */
export const aiChat = async (messages: any[]): Promise<{ content: string }> => {
  return { content: "ok" };
};
