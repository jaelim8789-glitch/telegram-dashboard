from datetime import datetime, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.referral import ReferralCode, ReferralCommission, ReferralPayout
from app.models.tenant import Tenant

logger = get_logger(__name__)

COMMISSION_RATE = 0.10
TIERS: list[tuple[int, float, str]] = [
    (0, 0.10, "기본"),
    (5, 0.15, "Pro"),
    (10, 0.20, "VIP"),
]


def _get_tier(referral_count: int) -> tuple[float, str]:
    rate = COMMISSION_RATE
    label = "기본"
    for min_refs, tier_rate, tier_label in TIERS:
        if referral_count >= min_refs and tier_rate > rate:
            rate = tier_rate
            label = tier_label
    return rate, label


async def get_referrer_tier(db: AsyncSession, referrer_id: str) -> tuple[float, str]:
    result = await db.execute(
        select(func.count(ReferralCommission.id))
        .where(
            ReferralCommission.referrer_id == referrer_id,
            ReferralCommission.status.in_(["pending", "paid"]),
        )
    )
    count = result.scalar_one_or_none() or 0
    return _get_tier(count)


async def create_commission(
    db: AsyncSession,
    referred_tenant_id: str,
    source_payment_id: str,
    source_type: str,
    amount: int,
    webhook_urls: list[str] | None = None,
) -> ReferralCommission | None:
    tenant = await db.get(Tenant, referred_tenant_id)
    if not tenant or not tenant.referred_by:
        return None

    ref_code = await db.get(ReferralCode, tenant.referred_by)
    if not ref_code:
        return None

    referrer_id = ref_code.owner_id
    if referrer_id == referred_tenant_id:
        return None

    rate, _ = await get_referrer_tier(db, referrer_id)
    commission_amount = max(1, int(amount * rate))

    commission = ReferralCommission(
        referrer_id=referrer_id,
        referred_user_id=referred_tenant_id,
        source_payment_id=source_payment_id,
        source_type=source_type,
        amount=amount,
        commission_rate=rate,
        commission_amount=commission_amount,
        status="pending",
    )
    db.add(commission)
    await db.commit()
    await db.refresh(commission)
    logger.info(
        "referral_commission_created",
        referrer_id=referrer_id,
        referred_user_id=referred_tenant_id,
        amount=commission_amount,
        rate=rate,
    )

    if webhook_urls:
        await _send_webhook(webhook_urls, "commission.created", {
            "commission_id": commission.id,
            "referrer_id": referrer_id,
            "amount": commission_amount,
            "rate": rate,
        })

    return commission


async def process_payouts(
    db: AsyncSession,
    min_amount: int = 100,
    webhook_urls_map: dict[str, list[str]] | None = None,
) -> tuple[int, int]:
    result = await db.execute(
        select(
            ReferralCommission.referrer_id,
            func.sum(ReferralCommission.commission_amount).label("total"),
        )
        .where(ReferralCommission.status == "pending")
        .group_by(ReferralCommission.referrer_id)
        .having(func.sum(ReferralCommission.commission_amount) >= min_amount)
    )
    rows = result.all()

    payouts_created = 0
    total_amount = 0

    for row in rows:
        referrer_id = row.referrer_id
        amount = row.total

        payout = ReferralPayout(
            referrer_id=referrer_id,
            amount=amount,
            status="completed",
            paid_at=datetime.now(timezone.utc).replace(tzinfo=None),
        )
        db.add(payout)

        await db.execute(
            ReferralCommission.__table__.update()
            .where(
                ReferralCommission.referrer_id == referrer_id,
                ReferralCommission.status == "pending",
            )
            .values(status="paid")
        )

        referrer_webhooks = (webhook_urls_map or {}).get(referrer_id, [])
        if referrer_webhooks:
            await _send_webhook(referrer_webhooks, "payout.completed", {
                "referrer_id": referrer_id,
                "amount": amount,
                "payout_id": payout.id,
            })

        payouts_created += 1
        total_amount += amount

    if payouts_created > 0:
        await db.commit()

    return payouts_created, total_amount


async def get_leaderboard(db: AsyncSession, limit: int = 20) -> list[dict]:
    result = await db.execute(
        select(
            ReferralCommission.referrer_id,
            func.count(ReferralCommission.id).label("ref_count"),
            func.coalesce(func.sum(ReferralCommission.commission_amount), 0).label("total_earned"),
        )
        .where(ReferralCommission.status.in_(["pending", "paid"]))
        .group_by(ReferralCommission.referrer_id)
        .order_by(func.sum(ReferralCommission.commission_amount).desc())
        .limit(limit)
    )
    rows = result.all()

    entries = []
    for rank, row in enumerate(rows, 1):
        tenant = await db.get(Tenant, row.referrer_id)
        count = row.ref_count
        rate, tier_label = _get_tier(count)
        entries.append({
            "rank": rank,
            "referrer_id": row.referrer_id,
            "phone": tenant.phone if tenant else "unknown",
            "referral_count": count,
            "total_commission_earned": row.total_earned,
            "tier": tier_label,
        })
    return entries


async def _send_webhook(urls: list[str], event: str, payload: dict) -> None:
    import json

    import httpx

    body = json.dumps({"event": event, "data": payload}, ensure_ascii=False, default=str)
    for url in urls:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                await client.post(url, content=body, headers={"Content-Type": "application/json"})
        except Exception as exc:
            logger.warning("webhook_failed", url=url, event=event, error=str(exc))
