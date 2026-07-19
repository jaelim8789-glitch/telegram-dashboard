"""Seed default AI plan limits."""
import asyncio
import uuid
from app.database import async_session_maker
from app.models.ai import AiPlanLimit
from sqlalchemy import select


async def seed():
    async with async_session_maker() as db:
        limits = [
            ("free", "chat", 10, 5000, 0),
            ("free", "reply_assistant", 20, 10000, 0),
            ("free", "broadcast_assistant", 5, 5000, 0),
            ("free", "operations_report", 2, 10000, 0),
            ("pro", "chat", 200, 100000, 0),
            ("pro", "reply_assistant", 500, 250000, 0),
            ("pro", "broadcast_assistant", 100, 100000, 0),
            ("pro", "operations_report", 50, 200000, 0),
            ("enterprise", "chat", 1000, 500000, 0),
            ("enterprise", "reply_assistant", 2000, 1000000, 0),
            ("enterprise", "broadcast_assistant", 500, 500000, 0),
            ("enterprise", "operations_report", 200, 1000000, 0),
        ]
        created = 0
        for plan, feature, req, tok, cred in limits:
            existing = await db.execute(
                select(AiPlanLimit).where(
                    AiPlanLimit.plan == plan,
                    AiPlanLimit.feature == feature,
                )
            )
            if existing.scalar_one_or_none():
                continue
            db.add(
                AiPlanLimit(
                    id=str(uuid.uuid4()),
                    plan=plan,
                    feature=feature,
                    max_requests_per_day=req,
                    max_tokens_per_day=tok,
                    max_credits_per_month=cred,
                    is_enabled=True,
                )
            )
            created += 1
        await db.commit()
        print(f"Seeded {created} plan limits")


asyncio.run(seed())