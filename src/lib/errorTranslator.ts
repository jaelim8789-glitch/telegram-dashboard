"use client";

const ERROR_MAP: Record<string, string> = {
  "not found": "찾을 수 없습니다",
  "network error": "네트워크 연결을 확인해주세요",
  "timeout": "요청 시간이 초과되었습니다",
  "unauthorized": "인증이 필요합니다. 다시 로그인해주세요",
  "forbidden": "접근 권한이 없습니다",
  "too many requests": "요청이 너무 많습니다. 잠시 후 다시 시도해주세요",
  "internal server error": "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요",
  "failed to fetch": "서버에 연결할 수 없습니다. 인터넷 연결을 확인해주세요",
  "abort": "요청이 중단되었습니다",
  "rate limit": "요청 제한에 도달했습니다. 잠시 기다려주세요",
  "already exists": "이미 존재합니다",
  "invalid": "입력값이 올바르지 않습니다",
  "required": "필수 항목이 비어있습니다",
  "not found": "데이터를 찾을 수 없습니다",
  "expired": "만료되었습니다. 새로고침 후 다시 시도해주세요",
  "token": "토큰이 유효하지 않습니다",
  "permission": "권한이 없습니다",
  "account": "계정 관련 오류입니다",
  "broadcast": "발송 중 오류가 발생했습니다",
  "database": "데이터베이스 오류입니다",
  "connection": "연결 오류입니다",
};

export function translateError(error: Error | string): string {
  const message = typeof error === "string" ? error : error.message || "";
  if (!message) return "알 수 없는 오류가 발생했습니다";

  for (const [en, ko] of Object.entries(ERROR_MAP)) {
    if (message.toLowerCase().includes(en)) return ko;
  }
  // If no match but it's clearly an English error message
  if (/^[A-Z]/.test(message) && !/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(message)) {
    return `오류가 발생했습니다: ${message.slice(0, 100)}`;
  }
  return message;
}

export function wrapApiCall<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(translateError(message));
  });
}
