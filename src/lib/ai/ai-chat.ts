/**
 * TeleMon AI — 채팅 API 호출 레이어
 *
 * 백엔드 ai-chat-v2 (/api/ai-chat-v2) 엔드포인트를 호출하고
 * TeleMon 시스템 프롬프트를 자동으로 주입합니다.
 */

import { telemonSystemPrompt } from "./telemon-prompt";
import { authHeaders, getApiBaseUrl } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────

export interface AiChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AiChatRequest {
  /** 사용자 메시지 (시스템 프롬프트는 자동 주입됨) */
  messages: AiChatMessage[];
  /** 기존 세션 ID (없으면 새 세션 생성) */
  sessionId?: string | null;
  /** True면 SSE 스트리밍 모드 */
  stream?: boolean;
  /** 스트리밍 시 각 청크를 전달할 콜백 */
  onStream?: (chunk: { type: "chunk" | "done" | "error"; content?: string; messageId?: string }) => void;
  /** 사용할 프롬프트 템플릿 ID */
  templateId?: string | null;
  /** 모델 override (기본값: deepseek-chat) */
  model?: string;
}

export interface AiChatResponse {
  /** 어시스턴트 응답 텍스트 */
  content: string;
  /** 세션 ID (후속 메시지에 사용) */
  sessionId: string;
  /** 메시지 ID (피드백 등에 사용) */
  messageId?: string;
  /** 오류 발생 시 */
  error?: string;
}

export interface AiChatSession {
  session_id: string;
  title?: string;
  first_message: string;
  last_message: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

// ── API Base URL ─────────────────────────────────────────────

const AI_CHAT_BASE = "/api/ai-chat-v2";

// ── Simple (non-streaming) Chat ──────────────────────────────

/**
 * TeleMon AI에 메시지를 보내고 응답을 받습니다.
 *
 * 시스템 프롬프트가 자동으로 주입되므로, messages에는
 * 사용자/어시스턴트 메시지만 포함하면 됩니다.
 *
 * @example
 * ```ts
 * const { content, sessionId } = await aiChat({
 *   messages: [{ role: "user", content: "홍보문 하나 만들어줘" }],
 * });
 * ```
 */
export async function aiChat(request: AiChatRequest): Promise<AiChatResponse> {
  const {
    messages,
    sessionId = null,
    stream = false,
    onStream,
    templateId = null,
    model,
  } = request;

  // Build API request body per ai-chat-v2 schema
  const body: Record<string, unknown> = {
    message: messages[messages.length - 1]?.content ?? "",
    session_id: sessionId,
    stream,
    template_id: templateId,
  };
  if (model) body.model = model;

  // For streaming mode
  if (stream && onStream) {
    return streamAiChat(body, onStream);
  }

  // Non-streaming
  const headers = await authHeaders();
  const res = await fetch(`${getApiBaseUrl()}${AI_CHAT_BASE}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    return {
      content: "",
      sessionId: sessionId ?? "",
      error: `API 오류 (${res.status}): ${errorText}`,
    };
  }

  const data = await res.json();
  return {
    content: data.reply ?? data.content ?? "",
    sessionId: data.session_id ?? sessionId ?? "",
    messageId: data.message_id,
  };
}

// ── SSE Streaming Chat ────────────────────────────────────────

async function streamAiChat(
  body: Record<string, unknown>,
  onStream: AiChatRequest["onStream"],
): Promise<AiChatResponse> {
  const headers = await authHeaders();
  const res = await fetch(`${getApiBaseUrl()}${AI_CHAT_BASE}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...headers,
    },
    body: JSON.stringify({ ...body, stream: true }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    onStream?.({ type: "error", content: `API 오류 (${res.status}): ${errorText}` });
    return { content: "", sessionId: "", error: `API 오류 (${res.status})` };
  }

  const reader = res.body?.getReader();
  if (!reader) {
    onStream?.({ type: "error", content: "스트림을 읽을 수 없습니다." });
    return { content: "", sessionId: "", error: "Stream not available" };
  }

  const decoder = new TextDecoder();
  let fullContent = "";
  let sessionId = "";
  let messageId = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "chunk") {
              fullContent += event.content ?? "";
              onStream?.({ type: "chunk", content: event.content });
            } else if (event.type === "done") {
              sessionId = event.session_id ?? "";
              messageId = event.message_id ?? "";
              onStream?.({ type: "done", content: fullContent, messageId });
            } else if (event.type === "error") {
              onStream?.({ type: "error", content: event.content });
              return { content: fullContent, sessionId, error: event.content };
            }
          } catch {
            // Skip unparseable SSE lines
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return { content: fullContent, sessionId, messageId };
}

// ── Session Management ────────────────────────────────────────

/** 세션 목록 조회 */
export async function listAiChatSessions(): Promise<AiChatSession[]> {
  const headers = await authHeaders();
  const res = await fetch(`${getApiBaseUrl()}${AI_CHAT_BASE}/sessions`, { headers });
  if (!res.ok) return [];
  return res.json();
}

/** 세션 삭제 */
export async function deleteAiChatSession(sessionId: string): Promise<boolean> {
  const headers = await authHeaders();
  const res = await fetch(`${getApiBaseUrl()}${AI_CHAT_BASE}/sessions/${sessionId}`, {
    method: "DELETE",
    headers,
  });
  return res.ok;
}

/** 세션 메시지 히스토리 조회 */
export async function getAiChatHistory(sessionId: string): Promise<AiChatMessage[]> {
  const headers = await authHeaders();
  const res = await fetch(
    `${getApiBaseUrl()}${AI_CHAT_BASE}/sessions/${sessionId}/messages`,
    { headers },
  );
  if (!res.ok) return [];
  return res.json();
}

// ── Utility ───────────────────────────────────────────────────

/**
 * 사용자 메시지와 함께 telemonSystemPrompt를 메시지 배열에 주입한
 * DeepSeek API 호출용 메시지 배열을 생성합니다.
 *
 * 주로 디버깅 또는 서버사이드 직접 호출에 사용합니다.
 */
export function buildMessagesWithPrompt(
  messages: AiChatMessage[],
): Array<{ role: string; content: string }> {
  // 시스템 프롬프트가 이미 포함되어 있으면 추가하지 않음
  const hasSystem = messages.some(
    (m) => m.role === "system" && m.content === telemonSystemPrompt,
  );
  if (hasSystem) return messages.map((m) => ({ role: m.role, content: m.content }));

  return [
    { role: "system", content: telemonSystemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];
}