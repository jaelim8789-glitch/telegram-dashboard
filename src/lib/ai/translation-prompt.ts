export const translationSystemPrompt = `당신은 TeleMon AI 번역 전문 비서입니다.

역할: Telegram 대화의 모든 메시지를 사용자의 모국어로 자동 번역합니다.

규칙:
1. 상대방 메시지 → 사용자 모국어 (한국어) 로 자동 번역
2. 사용자 메시지 → 상대방 언어로 자동 번역
3. 직역 금지 — 자연스러운 비즈니스 표현으로 현지화
4. 국가별 특성 반영:
   - 미국: 친근하지만 프로페셔널하게
   - 일본: 정중하고 격식 있게 (です/ます 체)
   - 중국: 간결하고 비즈니스 라이크하게
   - 태국: 부드럽고 존댓말 (ครับ/ค่ะ)
   - 러시아어: 정중한 비즈니스 톤
5. 상대방 언어 자동 감지
6. 번역문은 원문 아래에 작게 표시
7. 사용자가 원문을 보고 싶으면 토글 가능

출력: JSON
{
  "detectedLang": "en",
  "translated": "안녕하세요. 가격을 보내주실 수 있나요?",
  "original": "Hello, can you send me the price?"
}`;

export const COUNTRY_EXPRESSIONS: Record<string, { flag: string; greeting: string; followUp: string; closing: string }> = {
  en: {
    flag: "🇺🇸",
    greeting: "Hello!",
    followUp: "Let me know if you need anything else.",
    closing: "Best regards, TeleMon",
  },
  ja: {
    flag: "🇯🇵",
    greeting: "お世話になっております。",
    followUp: "ご不明な点がございましたら、お気軽にお問い合わせください。",
    closing: "引き続きよろしくお願いいたします。",
  },
  zh: {
    flag: "🇨🇳",
    greeting: "您好！",
    followUp: "如有任何疑问，请随时联系。",
    closing: "此致，TeleMon 团队",
  },
  th: {
    flag: "🇹🇭",
    greeting: "สวัสดีครับ",
    followUp: "หากมีข้อสงสัยเพิ่มเติม โปรดติดต่อเราได้ตลอดเวลา",
    closing: "ขอแสดงความนับถือ TeleMon",
  },
  ru: {
    flag: "🇷🇺",
    greeting: "Здравствуйте!",
    followUp: "Если у вас есть вопросы, обращайтесь.",
    closing: "С уважением, TeleMon",
  },
  ko: {
    flag: "🇰🇷",
    greeting: "안녕하세요!",
    followUp: "추가 문의사항이 있으시면 언제든지 연락주세요.",
    closing: "감사합니다, TeleMon 드림",
  },
};

export const FLAG_BY_LANG: Record<string, string> = {
  en: "🇺🇸", ja: "🇯🇵", zh: "🇨🇳", th: "🇹🇭", ru: "🇷🇺", ko: "🇰🇷", fr: "🇫🇷", de: "🇩🇪",
  es: "🇪🇸", pt: "🇧🇷", vi: "🇻🇳", id: "🇮🇩", ar: "🇦🇪", tr: "🇹🇷", it: "🇮🇹",
};

export const LANG_NAME: Record<string, string> = {
  en: "영어", ja: "일본어", zh: "중국어", th: "태국어", ru: "러시아어", ko: "한국어",
  fr: "프랑스어", de: "독일어", es: "스페인어", pt: "포르투갈어", vi: "베트남어",
  id: "인도네시아어", ar: "아랍어", tr: "터키어", it: "이탈리아어",
};
