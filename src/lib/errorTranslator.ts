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
  "invalid credentials": "계정 정보가 올바르지 않습니다. 아이디와 비밀번호를 확인해주세요",
  "invalid phone number": "전화번호 형식이 올바르지 않습니다",
  "invalid api key": "API 키가 유효하지 않습니다. 새 키를 발급받아주세요",
  "invalid code": "인증 코드가 올바르지 않습니다",
  "code expired": "인증 코드가 만료되었습니다. 다시 요청해주세요",
  "session expired": "세션이 만료되었습니다. 다시 로그인해주세요",
  "phone banned": "해당 전화번호가 텔레그램에서 제한되었습니다",
  "phone disconnected": "전화번호 연결이 해제되었습니다. 계정을 다시 등록해주세요",
  "flood wait": "텔레그램 속도 제한에 도달했습니다. 잠시 기다린 후 다시 시도해주세요",
  "phone number occupied": "이 전화번호는 다른 계정에서 이미 사용 중입니다",
  "phone number unoccupied": "이 전화번호에 연결된 계정이 없습니다",
  "invalid": "입력값이 올바르지 않습니다",
  "required": "필수 항목이 비어있습니다",
  "expired": "만료되었습니다. 새로고침 후 다시 시도해주세요",
  "token": "토큰이 유효하지 않습니다",
  "permission": "권한이 없습니다",
  "account suspended": "계정이 정지되었습니다. 자세한 내용은 고객 지원에 문의하세요",
  "account limited": "계정이 제한되었습니다. 텔레그램 앱에서 확인해주세요",
  "payment failed": "결제 처리 중 오류가 발생했습니다. 결제 수단을 확인해주세요",
  "subscription expired": "구독이 만료되었습니다. 요금제를 갱신해주세요",
  "plan limit": "요금제 한도에 도달했습니다. 업그레이드가 필요합니다",
  "daily limit": "일일 발송 한도에 도달했습니다",
  "account": "계정 관련 오류입니다",
  "broadcast": "발송 중 오류가 발생했습니다",
  "database": "데이터베이스 오류입니다",
  "connection": "연결 오류입니다",
  "telegram": "텔레그램 API 오류입니다",
  "dns": "DNS 조회에 실패했습니다. 네트워크 설정을 확인해주세요",
  "ssl": "SSL 연결 오류입니다. 보안 연결을 확인해주세요",
  "cors": "CORS 정책 위반입니다. 서버 설정을 확인해주세요",
};

const EN_MAP: Record<string, string> = {
  "not found": "Not found",
  "network error": "Network connection error. Please check your internet.",
  "timeout": "Request timed out",
  "unauthorized": "Authentication required. Please log in again.",
  "too many requests": "Too many requests. Please try again later.",
  "internal server error": "Server error. Please try again later.",
  "failed to fetch": "Cannot connect to server. Please check your internet.",
  "rate limit": "Rate limit reached. Please wait.",
  "invalid credentials": "Invalid credentials. Please check your ID and password.",
  "invalid phone number": "Invalid phone number format.",
  "flood wait": "Telegram flood wait reached. Please wait and try again.",
  "account suspended": "Account suspended. Please contact support.",
  "payment failed": "Payment processing error. Please check your payment method.",
  "subscription expired": "Subscription expired. Please renew your plan.",
};

function getCurrentLocale(): string {
  if (typeof window === "undefined") return "ko";
  try {
    const stored = localStorage.getItem("telemon-locale");
    if (stored) return stored;
  } catch {}
  return navigator.language?.startsWith("en") ? "en" : "ko";
}

export function translateError(error: Error | string): string {
  const message = typeof error === "string" ? error : error.message || "";
  if (!message) return "알 수 없는 오류가 발생했습니다";

  const locale = getCurrentLocale();
  const map = locale === "en" ? EN_MAP : ERROR_MAP;

  for (const [en, msg] of Object.entries(map)) {
    if (message.toLowerCase().includes(en)) return msg;
  }
  if (/^[A-Z]/.test(message) && !/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(message)) {
    return locale === "en" ? `Error: ${message.slice(0, 100)}` : `오류가 발생했습니다: ${message.slice(0, 100)}`;
  }
  return message;
}

export function wrapApiCall<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(translateError(message));
  });
}
