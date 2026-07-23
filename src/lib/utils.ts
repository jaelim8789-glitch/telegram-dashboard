// XSS 방지를 위한 문자열 이스케이프 함수
export function escapeHtml(text: string): string {
  if (typeof text !== 'string') {
    return '';
  }
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\//g, '&#x2F;');
}

// 사용자 입력 검증 함수
export function sanitizeInput(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // 길이 제한
  if (input.length > maxLength) {
    throw new Error(`Input exceeds maximum length of ${maxLength} characters`);
  }
  
  // HTML 태그 제거 (기본적인 태그만 허용)
  const allowedTags = ['br', 'p', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li'];
  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^<>]*>/g;
  
  // 태그 검증
  const sanitized = input.replace(tagRegex, (tag, tagName) => {
    if (allowedTags.includes(tagName.toLowerCase())) {
      return tag;
    }
    // 허용되지 않은 태그는 이스케이프 처리
    return escapeHtml(tag);
  });
  
  return sanitized;
}

// 콘텐츠 보안 정책(CSP) 헤더 생성
export function generateCSPHeader(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' https:",
    "connect-src 'self' https:",
    "frame-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'"
  ].join('; ');
}

// ... 기존 코드 계속 ...