/**
 * TeleMon AI — barrel export
 *
 * src/lib/ai/ 하위 모듈의 공개 API를 한 곳에서 import할 수 있도록 합니다.
 *
 * @example
 * ```ts
 * import { aiChat, telemonSystemPrompt, PROMPT_SECTIONS } from "@/lib/ai";
 * ```
 */

// System prompt
export { telemonSystemPrompt, PROMPT_SECTIONS, PROMPT_VERSION } from "./telemon-prompt";

// Shadow prompt
export { shadowSystemPrompt } from "./shadow-prompt";

// Chat API
export {
  chat as aiChat,
} from "./ai-chat";

export type {
  AiChatMessage,
  AiChatRequest,
  AiChatResponse,
  AiChatSession,
} from "./ai-chat";

// Whisper prompt
export { whisperSystemPrompt } from "./whisper-prompt";