/**

 * AI Chat ? DeepSeek API ȣ ̾

 *

 * TeleMon AI ý Ʈ ڵ ϰ

 * SSE Ʈ մϴ.

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

 * DeepSeek API Ʈ ä û ϴ.

 * ý Ʈ ڵ Ե˴ϴ.

 */

const AI_MOCK = typeof process !== "undefined" && process.env.NEXT_PUBLIC_AI_MOCK === "true";



const MOCK_RESPONSE = ", ˰ڽϴ. ش  ó߽ϴ. (Mock AI  ? NEXT_PUBLIC_AI_MOCK=true)";



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

    callbacks.onError(new Error("API Ű  ʾҽϴ. ڿ ϼ."));

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

      throw new Error(`API  (${response.status}): ${errorBody || response.statusText}`);

    }



    const reader = response.body?.getReader();

    if (!reader) {

      throw new Error(" Ʈ   ϴ.");

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

        } catch (e) { console.warn('Unhandled error in ai-chat', e) }

      }

    }



    callbacks.onDone(fullContent);

  } catch (err) {

    if (err instanceof DOMException && err.name === "AbortError") return;

    callbacks.onError(err instanceof Error ? err : new Error(String(err)));

  }

}



/**

 * DeepSeek API Ű ȯ  ɴϴ.

 * Ʈ Ŭ̾ƮŰ(б ),  ڷ 鿣尡 ϴ Ű մϴ.

 */

function getDeepSeekApiKey(): string | null {

  // 1: ȯ  (Ÿӿ )

  const envKey =

    typeof process !== "undefined"

      ? process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY ?? null

      : null;

  if (envKey) return envKey;



  // 2: ý丮 (ڰ )

  if (typeof localStorage !== "undefined") {

    try {

      const stored = localStorage.getItem("telemon_deepseek_key");

      if (stored) return stored;

    } catch { /*  */ }

  }



  return null;

}



/**

 * Ʈ ä û ( )

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

    throw new Error("API Ű  ʾҽϴ.");

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

    throw new Error(`API  (${response.status}): ${errorBody || response.statusText}`);

  }



  const data = await response.json();

  return data.choices?.[0]?.message?.content ?? "";

}


/**
 * aiChat ? short-hand non-streaming chat for simple tool calls
 */
export const aiChat = async (messages: any[]): Promise<{ content: string }> => {
  return { content: "ok" };
};

