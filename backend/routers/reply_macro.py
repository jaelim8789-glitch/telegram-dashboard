"""Reply Macro API endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..models import ReplyMacro, ReplyMacroLog
from ..runtime_manager import RuntimeManager

router = APIRouter()


@router.get("/accounts/{account_id}/reply-macros", response_model=list[ReplyMacro])
async def get_reply_macros(account_id: str):
    manager = RuntimeManager.get_instance()
    return await manager.get_reply_macros(account_id)


@router.post("/accounts/{account_id}/reply-macros", response_model=ReplyMacro)
async def create_reply_macro(account_id: str, body: dict):
    manager = RuntimeManager.get_instance()
    try:
        macro = await manager.create_reply_macro(account_id, body)
        return macro
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/accounts/{account_id}/reply-macros/{macro_id}", response_model=ReplyMacro)
async def update_reply_macro(account_id: str, macro_id: str, body: dict):
    manager = RuntimeManager.get_instance()
    try:
        macro = await manager.update_reply_macro(account_id, macro_id, body)
        return macro
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/accounts/{account_id}/reply-macros/{macro_id}")
async def delete_reply_macro(account_id: str, macro_id: str):
    manager = RuntimeManager.get_instance()
    try:
        await manager.delete_reply_macro(account_id, macro_id)
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/accounts/{account_id}/reply-macros/{macro_id}/execute")
async def execute_reply_macro(account_id: str, macro_id: str):
    manager = RuntimeManager.get_instance()
    try:
        await manager.execute_reply_macro(account_id, macro_id)
        return {"status": "executed"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/accounts/{account_id}/reply-macros/{macro_id}/logs", response_model=list[ReplyMacroLog])
async def get_reply_macro_logs(account_id: str, macro_id: str):
    manager = RuntimeManager.get_instance()
    return await manager.get_reply_macro_logs(account_id, macro_id)
