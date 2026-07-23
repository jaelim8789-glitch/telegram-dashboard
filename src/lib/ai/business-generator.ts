import { CATEGORY_PROMPTS, FALLBACK_TEMPLATES } from '../business-templates';

// AI가 생성한 결과 구조
export interface BusinessPackage {
  businessName: string;
  category: string;
  introduction: string;       // 소개문
  faq: { q: string; a: string }[];
  autoReplies: { keyword: string; response: string }[];
  promotions: { short: string; long: string };
  profile: { name: string; desc: string; contact: string; address?: string };
  notices: { title: string; content: string }[];
  reservationTemplate: string;
}

/**
 * 사용자 입력에 비즈니스 생성 요청이 포함되어 있는지 감지
 */
export function detectBusinessCreationRequest(input: string): boolean {
  const businessCreationPatterns = [
    /.*(회사|업체|샵|점|가게|사업|비즈니스).*하나? 만들.*/,
    /.*(회사|업체|샵|점|가게|사업|비즈니스).*시작.*/,
    /.*(회사|업체|샵|점|가게|사업|비즈니스).*오픈.*/,
    /.*(회사|업체|샵|점|가게|사업|비즈니스).*운영.*/,
    /.*비즈니스.*시작.*/,
    /.*사업.*시작.*/,
    /.*가게.*오픈.*/,
    /.*샵.*오픈.*/,
  ];

  const lowerInput = input.toLowerCase();
  
  return businessCreationPatterns.some(pattern => pattern.test(lowerInput));
}

/**
 * 사용자 입력에 따라 비즈니스 패키지를 생성합니다
 */
export async function generateBusinessPackage(
  userInput: string,         // "부동산 회사 하나 만들어"
  category?: string          // 자동 감지 or 사용자 지정
): Promise<BusinessPackage> {
  try {
    // 1. 카테고리 자동 감지 (키워드 기반)
    const detectedCategory = category || detectCategory(userInput);
    
    // 2. DeepSeek API 호출
    const prompt = buildPrompt(userInput, detectedCategory);
    const response = await callDeepSeekAPI(prompt);
    
    // 3. JSON 파싱해서 BusinessPackage 반환
    const parsedResponse = parseResponse(response);
    
    // 4. 결과 유효성 검사
    if (isValidBusinessPackage(parsedResponse)) {
      return {
        ...parsedResponse,
        category: detectedCategory
      };
    } else {
      throw new Error("Invalid business package format");
    }
  } catch (error) {
    console.error("Failed to generate business package:", error);
    // 5. 실패 시 fallback 템플릿 반환
    return getFallbackTemplate(category || detectCategory(userInput));
  }
}

/**
 * 사용자 입력에서 카테고리 감지
 */
function detectCategory(input: string): string {
  const lowerInput = input.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerInput.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }
  
  return "기타";
}

/**
 * 카테고리별 키워드 매핑
 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  부동산: ["부동산", "부동산 회사", "부동산 업체", "매매", "전세", "월세", "임대"],
  음식점: ["음식점", "레스토랑", "식당", "맛집", "뷔페", "술집", "카페", "주점"],
  카페: ["카페", "커피숍", "디저트카페", "베이커리", "찻집"],
  병원: ["병원", "의원", " clinic", "의료", "진료", "치과", "한의원", "피부과"],
  학원: ["학원", "교육", "학습", " tutoring", "과외", "재능", "학습塾"],
  법률사무소: ["변호사", "법률", "법무", "소송", "자문", "계약", "법률사무소"],
  세무회계: ["세무", "회계", "장부", "세금", "신고", "기장", "세무사", "공인회계사"],
  미용실: ["미용실", "헤어샵", "뷰티", "샵", "미용", "컷트", "염색", "펌"],
  온라인쇼핑몰: ["쇼핑몰", "이커머스", "판매", "mall", "shop", "onlinestore", "전자상거래"],
  헬스장: ["헬스장", "휘트니스", "짐", "운동", "fitness", "헬스클럽", "GYM"],
  "PT샵": ["PT", "퍼스널트레이닝", "운동", "헬스", "트레이너", "body", "workout"],
  사진관: ["사진관", "촬영", "포토", "studio", "wedding", "촬영소", "이미용"],
  이벤트: ["이벤트", "행사", "웨딩", "기념일", "파티", "행사대행", "planner"],
  기타: ["기타", "다른", "other"]
};

/**
 * DeepSeek API 호출
 */
async function callDeepSeekAPI(prompt: string): Promise<string> {
  // 현재는 더미 응답으로 대체, 실제 구현 시 DeepSeek API 호출 필요
  console.log("Calling DeepSeek API with prompt:", prompt);
  
  // 더미 응답 생성 (실제 API 호출 시에는 제거)
  const dummyResponse = JSON.stringify({
    businessName: "부동산 거래 전문회사",
    introduction: "고객님의 부동산 거래를 전문적으로 책임지는 부동산 회사입니다.",
    faq: [
      { q: "거래 가능한 지역은 어디인가요?", a: "서울, 경기, 인천 등 수도권 지역을 중심으로 거래를 진행하고 있습니다." }
    ],
    autoReplies: [
      { keyword: "매물", response: "현재 등록된 매물 정보를 확인해드리겠습니다." }
    ],
    promotions: {
      short: "신뢰성 있는 부동산 거래, 전문가와 함께하세요!",
      long: "고객님의 부동산 거래를 전문적으로 책임지는 부동산 회사입니다."
    },
    profile: {
      name: "부동산 거래 전문회사",
      desc: "다양한 지역의 우수한 매물과 전문적인 상담 서비스를 제공하는 부동산 전문 회사입니다.",
      contact: "02-1234-5678",
      address: "서울특별시 강남구 역삼동 123-456"
    },
    notices: [
      { title: "신규 매물 등록 안내", content: "신규 매물이 등록되었습니다." }
    ],
    reservationTemplate: "안녕하세요, [고객명]님. [날짜] [시간]에 상담 예약이 확정되었습니다."
  });
  
  return dummyResponse;
}

/**
 * 프롬프트 구성
 */
function buildPrompt(userInput: string, category: string): string {
  const basePrompt = `다음 요청에 따라 ${category} 비즈니스 패키지를 생성해주세요. JSON 형식으로 응답해주세요.

요청: "${userInput}"

JSON 형식은 다음과 같아야 합니다:
{
  "businessName": "비즈니스 이름",
  "introduction": "비즈니스 소개문",
  "faq": [{"q": "질문", "a": "답변"}, ...],
  "autoReplies": [{"keyword": "키워드", "response": "응답"}, ...],
  "promotions": {"short": "짧은 홍보문", "long": "긴 홍보문"},
  "profile": {"name": "이름", "desc": "설명", "contact": "연락처", "address": "주소"},
  "notices": [{"title": "제목", "content": "내용"}, ...],
  "reservationTemplate": "예약 문자 템플릿"
}

${CATEGORY_PROMPTS[category] || ''}`;

  return basePrompt;
}

/**
 * 응답 파싱
 */
function parseResponse(response: string): BusinessPackage {
  try {
    // JSON 부분만 추출 (마크다운 코드 블록 포함될 수 있음)
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```|(.*)/);
    const jsonString = (jsonMatch?.[1] || jsonMatch?.[2] || response).trim();
    
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Failed to parse response as JSON:", error);
    throw error;
  }
}

/**
 * 비즈니스 패키지 유효성 검사
 */
function isValidBusinessPackage(data: any): data is BusinessPackage {
  return (
    typeof data.businessName === 'string' &&
    typeof data.introduction === 'string' &&
    Array.isArray(data.faq) &&
    Array.isArray(data.autoReplies) &&
    typeof data.promotions === 'object' &&
    typeof data.profile === 'object' &&
    Array.isArray(data.notices) &&
    typeof data.reservationTemplate === 'string'
  );
}

/**
 * 폴백 템플릿 가져오기
 */
function getFallbackTemplate(category: string): BusinessPackage {
  const fallback = FALLBACK_TEMPLATES[category];
  if (fallback) {
    return fallback;
  }
  
  // 기본 템플릿 반환
  return {
    businessName: `${category} 비즈니스`,
    category,
    introduction: `${category} 비즈니스에 오신 것을 환영합니다.`,
    faq: [
      { q: "문의 사항이 있습니다.", a: "문의해 주셔서 감사합니다. 빠르게 답변해 드리겠습니다." }
    ],
    autoReplies: [
      { keyword: "문의", response: "문의해 주셔서 감사합니다. 빠르게 답변해 드리겠습니다." }
    ],
    promotions: {
      short: `${category} 서비스를 경험해보세요.`,
      long: `${category} 비즈니스입니다. 최고의 서비스를 제공하기 위해 노력하고 있습니다.`
    },
    profile: {
      name: `${category} 비즈니스`,
      desc: `${category} 관련 서비스를 제공하는 전문 비즈니스입니다.`,
      contact: "02-000-0000"
    },
    notices: [
      { title: "공지사항", content: "새로운 소식을 전해드립니다." }
    ],
    reservationTemplate: "안녕하세요, [고객명]님. [날짜] [시간] 예약이 확정되었습니다."
  };
}