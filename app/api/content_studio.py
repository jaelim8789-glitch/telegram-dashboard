"""
AI Content Studio — content generation & calendar preview endpoints.

Kiro: 이 파일을 프로젝트 구조에 맞게 리팩토링하세요.
현재는 통합 테스트용 독립 라우터입니다.
"""

from __future__ import annotations

import logging
import random
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger("telemon.content_studio")

router = APIRouter(prefix="/api/ai/content-studio", tags=["content-studio"])

CONTENT_TYPES = {
    "quote": "오늘의 명언",
    "morning_greeting": "아침인사",
    "market_briefing": "시장브리핑",
    "news_summary": "뉴스요약",
    "investor_quote": "투자명언",
    "promotion": "홍보글",
}

CONTENT_TYPE_ORDER = [
    "morning_greeting",
    "quote",
    "market_briefing",
    "news_summary",
    "investor_quote",
    "promotion",
]

TIME_SLOTS = ["08:00", "09:00", "10:00", "12:00", "14:00", "15:00", "17:00", "18:00", "20:00"]


# ── Request / Response models ──────────────────────────────────────────


class GenerateRequest(BaseModel):
    content_type: str
    tone: str = "professional"
    topic: Optional[str] = None
    context: Optional[str] = None
    style_profile_id: Optional[str] = None


class GenerateResponse(BaseModel):
    content_type: str
    tone: str
    generated_content: str
    tokens_used: int
    style_profile_id: Optional[str] = None


class CalendarPreviewRequest(BaseModel):
    daily_count: int = 3
    content_types: list[str]


class CalendarSlot(BaseModel):
    time: str
    content_type: str
    label: str


class CalendarPreviewResponse(BaseModel):
    slots: list[CalendarSlot]


# ── Endpoints ──────────────────────────────────────────────────────────


@router.post("/generate")
async def generate_content(req: GenerateRequest) -> GenerateResponse:
    if req.content_type not in CONTENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Unknown content_type: {req.content_type}. Valid: {list(CONTENT_TYPES.keys())}")

    mock_responses = {
        "quote": "\"오늘도 최선을 다하는 당신에게 행운이 함께하기를 바랍니다.\"\n\n— TeleMon AI\n\n#오늘의명언 #motivation",
        "morning_greeting": "좋은 아침입니다! 🌅\n\n오늘도 힘차게 시작하세요.\n당신의 하루가 빛나길 응원합니다.\n\n— TeleMon AI —",
        "market_briefing": "【오늘의 시장 동향】\n\n• 코스피: 전일대비 +0.8% (2,680pt)\n• 코스닥: 전일대비 +1.2% (890pt)\n• 원/달러: 1,320원 (보합)\n\n※ 본 브리핑은 참고용입니다.",
        "news_summary": "【헤드라인】\n\n1. AI 반도체 시장 2027년까지 연평균 40% 성장 전망\n2. 정부, 소상공인 디지털 전환 지원 확대\n3. 글로벌 공급망 재편 가속화\n\n자세한 내용은 뉴스 앱에서 확인하세요.",
        "investor_quote": "\"다른 사람들이 탐욕스러울 때 두려워하고, 다른 사람들이 두려워할 때 탐욕스러워져라.\"\n\n— 워렌 버핏\n\n오늘의 시장 변동성, 기회로 활용하세요.",
        "promotion": "안녕하세요, TeleMon입니다! 🚀\n\nAI 기반 스마트 메시징으로\n비즈니스 성장을 가속화하세요.\n\n✅ AI 자동 발송\n✅ 스마트 답장 추천\n✅ 실시간 분석\n\n지금 바로 시작해보세요!",
    }

    body = mock_responses.get(req.content_type, mock_responses["quote"])
    if req.topic:
        body = f"[주제: {req.topic}]\n\n{body}"

    return GenerateResponse(
        content_type=req.content_type,
        tone=req.tone,
        generated_content=body,
        tokens_used=random.randint(50, 200),
        style_profile_id=req.style_profile_id,
    )


@router.post("/calendar/preview")
async def calendar_preview(req: CalendarPreviewRequest) -> CalendarPreviewResponse:
    valid_types = [ct for ct in req.content_types if ct in CONTENT_TYPES]
    if not valid_types:
        raise HTTPException(status_code=400, detail="No valid content_types provided")

    sorted_types = sorted(valid_types, key=lambda ct: CONTENT_TYPE_ORDER.index(ct) if ct in CONTENT_TYPE_ORDER else 999)

    slots = []
    for i in range(min(req.daily_count, len(sorted_types))):
        ct = sorted_types[i]
        time = TIME_SLOTS[i] if i < len(TIME_SLOTS) else f"{8 + i:02d}:00"
        slots.append(CalendarSlot(
            time=time,
            content_type=ct,
            label=CONTENT_TYPES.get(ct, ct),
        ))

    return CalendarPreviewResponse(slots=slots)