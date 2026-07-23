"""Auto-reply API endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..models import AutoReplyLog, AutoReplyRule, AutoReplySettings
from ..runtime_manager import RuntimeManager

router = APIRouter()


@router.get("/accounts/{account_id}/auto-reply", response_model=AutoReplySettings)
async def get_auto_reply_settings(account_id: str):
    manager = RuntimeManager.get_instance()
    try:
        return await manager.get_auto_reply_settings(account_id)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/accounts/{account_id}/auto-reply", response_model=AutoReplyRule)
async def create_auto_reply_rule(account_id: str, body: dict):
    manager = RuntimeManager.get_instance()
    try:
        rule = await manager.create_auto_reply_rule(account_id, body)
        return rule
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/accounts/{account_id}/auto-reply/{rule_id}", response_model=AutoReplyRule)
async def update_auto_reply_rule(account_id: str, rule_id: str, body: dict):
    manager = RuntimeManager.get_instance()
    try:
        rule = await manager.update_auto_reply_rule(account_id, rule_id, body)
        return rule
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/accounts/{account_id}/auto-reply/{rule_id}")
async def delete_auto_reply_rule(account_id: str, rule_id: str):
    manager = RuntimeManager.get_instance()
    try:
        await manager.delete_auto_reply_rule(account_id, rule_id)
        return {"status": "deleted"}
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/accounts/{account_id}/auto-reply/toggle")
async def toggle_auto_reply(account_id: str, body: dict):
    enabled = body.get("enabled", False)
    manager = RuntimeManager.get_instance()
    try:
        if enabled:
            runtime = manager.get_runtime(account_id)
            if not runtime:
                raise HTTPException(status_code=404, detail="Account not found")
            if not runtime.health_monitor._state.has_session:
                raise HTTPException(
                    status_code=400,
                    detail="계정이 아직 인증되지 않았습니다. 먼저 '계정 등록'에서 Telegram 인증을 완료해주세요."
                )
        result = await manager.toggle_auto_reply(account_id, enabled)
        return {"account_id": account_id, "auto_reply_enabled": result}
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/accounts/{account_id}/auto-reply/logs", response_model=list[AutoReplyLog])
async def get_auto_reply_logs(account_id: str):
    manager = RuntimeManager.get_instance()
    return await manager.get_auto_reply_logs(account_id)
