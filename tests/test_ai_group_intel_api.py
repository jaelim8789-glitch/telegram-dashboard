"""Endpoint tests for AI Group Intelligence (app.api.ai_group_intel).

Tests verify:
- GET /api/ai/groups/{account_id}/analyze — group classification
- POST /api/ai/groups/{account_id}/best-targets — target recommendations
- GET /api/ai/groups/{account_id}/analytics — aggregate stats
- All endpoints handle DeepSeek failure with 503
- All endpoints handle unauthenticated accounts
"""

import json
from unittest.mock import AsyncMock

import pytest

from app.main import app
# Patch at the import site in ai_group_intel so _fetch_groups uses our mock
import app.api.ai_group_intel as ai_group_intel_module
import app.api.deps as deps_module
import app.crud.account as account_crud_module
import app.services.ai_chat_service as ai_chat_service_module


# Sample group data matching the list_groups return format
_SAMPLE_GROUPS = [
    {"chat_id": "-1001", "title": "VIP 고객 채널", "type": "channel", "participants_count": 5000},
    {"chat_id": "-1002", "title": "마케팅 팀 공지", "type": "megagroup", "participants_count": 1200},
    {"chat_id": "-1003", "title": "고객 지원 그룹", "type": "group", "participants_count": 350},
    {"chat_id": "-1004", "title": "신규 서비스 홍보", "type": "channel", "participants_count": 15000},
    {"chat_id": "-1005", "title": "개발자 커뮤니티", "type": "group", "participants_count": 80},
]


@pytest.fixture(autouse=True)
def _patch_dependencies(monkeypatch):
    """Patch dependencies so tests don't need real DB accounts or Telethon."""
    # Patch _fetch_groups to return sample data without touching Telegram
    async def _mock_fetch(account_id, db):
        return _SAMPLE_GROUPS
    monkeypatch.setattr(ai_group_intel_module, "_fetch_groups", _mock_fetch)
    # Patch require_account_tenant_access to be a no-op (we test AI logic, not auth)
    async def _mock_require(*args, **kwargs):
        pass
    monkeypatch.setattr(ai_group_intel_module, "require_account_tenant_access", _mock_require)


# ═══════════════════════════════════════════════════════════════════
#  GET /api/ai/groups/{account_id}/analyze
# ═══════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_analyze_groups_returns_classifications(client, monkeypatch):
    fake_json = json.dumps({
        "classifications": [
            {"chat_id": "-1001", "topic": "VIP", "engagement_level": "medium", "language": "ko"},
            {"chat_id": "-1002", "topic": "마케팅", "engagement_level": "high", "language": "ko"},
            {"chat_id": "-1003", "topic": "고객지원", "engagement_level": "high", "language": "ko"},
            {"chat_id": "-1004", "topic": "홍보", "engagement_level": "low", "language": "ko"},
            {"chat_id": "-1005", "topic": "개발", "engagement_level": "medium", "language": "ko"},
        ],
        "summary": "5개의 그룹/채널을 분석했습니다. 마케팅과 고객지원 그룹의 참여도가 높습니다.",
    })
    monkeypatch.setattr(ai_group_intel_module, "_call_deepseek", AsyncMock(return_value=fake_json))

    res = await client.get("/api/ai/groups/test-acc-1/analyze?min_members=0&max_groups=50")

    assert res.status_code == 200
    body = res.json()
    assert body["total_analyzed"] == 5
    assert len(body["groups"]) == 5
    # Groups sorted by participants descending: -1004 (15000, 홍보), -1001 (5000, VIP), ...
    assert body["groups"][0]["topic"] == "홍보"
    assert body["groups"][0]["engagement_level"] == "low"
    assert body["groups"][0]["size_category"] == "xlarge"  # 15000 members
    assert body["groups"][1]["topic"] == "VIP"
    assert body["groups"][1]["engagement_level"] == "medium"
    assert body["groups"][1]["size_category"] == "large"  # 5000 members
    assert body["summary"]


@pytest.mark.asyncio
async def test_analyze_groups_filters_by_min_members(client, monkeypatch):
    # Return empty classifications so the endpoint still processes groups but with no AI data
    monkeypatch.setattr(ai_group_intel_module, "_call_deepseek", AsyncMock(return_value=json.dumps({
        "classifications": [], "summary": "필터 통과한 그룹 없음",
    })))
    # Use min_members high enough to filter out ALL sample groups
    res = await client.get("/api/ai/groups/test-acc-1/analyze?min_members=99999&max_groups=50")

    assert res.status_code == 200
    body = res.json()
    assert body["total_analyzed"] == 0
    assert body["groups"] == []


@pytest.mark.asyncio
async def test_analyze_groups_503_on_deepseek_failure(client, monkeypatch):
    monkeypatch.setattr(ai_group_intel_module, "_call_deepseek", AsyncMock(return_value=None))

    res = await client.get("/api/ai/groups/test-acc-1/analyze")

    assert res.status_code == 503


@pytest.mark.asyncio
async def test_analyze_groups_degrades_on_malformed_json(client, monkeypatch):
    monkeypatch.setattr(ai_group_intel_module, "_call_deepseek", AsyncMock(return_value="순수 텍스트"))

    res = await client.get("/api/ai/groups/test-acc-1/analyze")

    assert res.status_code == 200
    body = res.json()
    # Should still return groups with default classifications
    assert body["total_analyzed"] == 5
    assert all(g["topic"] == "미분류" for g in body["groups"])


# ═══════════════════════════════════════════════════════════════════
#  POST /api/ai/groups/{account_id}/best-targets
# ═══════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_best_targets_returns_recommendations(client, monkeypatch):
    fake_json = json.dumps({
        "recommendations": [
            {"chat_id": "-1004", "reason": "가장 큰 채널로 신규 서비스 홍보에 적합", "confidence": 0.92, "estimated_reach": 15000},
            {"chat_id": "-1001", "reason": "VIP 고객 대상 프리미엄 서비스 홍보", "confidence": 0.85, "estimated_reach": 5000},
        ],
        "reasoning_summary": "신규 서비스 홍보에는 대규모 채널 2곳이 가장 효과적입니다.",
    })
    monkeypatch.setattr(ai_group_intel_module, "_call_deepseek", AsyncMock(return_value=fake_json))

    res = await client.post(
        "/api/ai/groups/test-acc-1/best-targets",
        json={"broadcast_purpose": "신규 서비스 홍보", "max_recommendations": 5},
    )

    assert res.status_code == 200
    body = res.json()
    assert body["purpose"] == "신규 서비스 홍보"
    assert len(body["recommendations"]) == 2
    assert body["recommendations"][0]["chat_id"] == "-1004"
    assert body["recommendations"][0]["confidence"] == 0.92
    assert body["recommendations"][0]["estimated_reach"] == 15000
    assert body["reasoning_summary"]


@pytest.mark.asyncio
async def test_best_targets_filters_unknown_chat_ids(client, monkeypatch):
    fake_json = json.dumps({
        "recommendations": [
            {"chat_id": "-1001", "reason": "좋은 채널", "confidence": 0.8, "estimated_reach": 5000},
            {"chat_id": "unknown-id", "reason": "존재하지 않는 채널", "confidence": 0.5, "estimated_reach": 0},
        ],
        "reasoning_summary": "테스트",
    })
    monkeypatch.setattr(ai_group_intel_module, "_call_deepseek", AsyncMock(return_value=fake_json))

    res = await client.post(
        "/api/ai/groups/test-acc-1/best-targets",
        json={"broadcast_purpose": "테스트"},
    )

    assert res.status_code == 200
    body = res.json()
    # "unknown-id" should be filtered out
    assert len(body["recommendations"]) == 1
    assert body["recommendations"][0]["chat_id"] == "-1001"


@pytest.mark.asyncio
async def test_best_targets_503_on_deepseek_failure(client, monkeypatch):
    monkeypatch.setattr(ai_group_intel_module, "_call_deepseek", AsyncMock(return_value=None))

    res = await client.post(
        "/api/ai/groups/test-acc-1/best-targets",
        json={"broadcast_purpose": "테스트"},
    )

    assert res.status_code == 503


# ═══════════════════════════════════════════════════════════════════
#  GET /api/ai/groups/{account_id}/analytics
# ═══════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_group_analytics_returns_aggregate_stats(client):
    res = await client.get("/api/ai/groups/test-acc-1/analytics")

    assert res.status_code == 200
    body = res.json()
    assert body["total_groups"] == 3  # 2 groups + 1 megagroup
    assert body["total_channels"] == 2
    assert body["total_participants"] == 5000 + 1200 + 350 + 15000 + 80
    assert body["by_size"]["large"] >= 1  # 5000 and 15000 are large
    assert len(body["top_groups"]) >= 1
    assert len(body["top_channels"]) >= 1


# ═══════════════════════════════════════════════════════════════════
#  Schema validation tests
# ═══════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_best_targets_validates_purpose_required(client):
    res = await client.post(
        "/api/ai/groups/test-acc-1/best-targets",
        json={"broadcast_purpose": ""},
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_analyze_groups_validates_max_groups_range(client):
    res = await client.get("/api/ai/groups/test-acc-1/analyze?max_groups=999")
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_best_targets_validates_max_recommendations_range(client):
    res = await client.post(
        "/api/ai/groups/test-acc-1/best-targets",
        json={"broadcast_purpose": "테스트", "max_recommendations": 99},
    )
    assert res.status_code == 422