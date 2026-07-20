import csv
import io
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, func, and_, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
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

    existing = await db.execute(
        select(ReferralCommission).where(
            ReferralCommission.referrer_id == referrer_id,
            ReferralCommission.referred_user_id == referred_tenant_id,
            ReferralCommission.source_payment_id == source_payment_id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        logger.info("commission_duplicate_skipped", referrer_id=referrer_id, source_payment_id=source_payment_id)
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
    logger.info("referral_commission_created", referrer_id=referrer_id, referred_user_id=referred_tenant_id, amount=commission_amount, rate=rate)

    if webhook_urls:
        await _send_webhook(webhook_urls, "commission.created", {
            "commission_id": commission.id,
            "referrer_id": referrer_id,
            "amount": commission_amount,
            "rate": rate,
        })

    referrer = await db.get(Tenant, referrer_id)
    if referrer and referrer.telegram_chat_id:
        await _send_telegram_notification(
            referrer.telegram_chat_id,
            f"🎉 새로운 추천인 커미션이 발생했습니다!\n\n"
            f"금액: {commission_amount}원\n"
            f"수수료율: {int(rate * 100)}%\n"
            f"상태: 지급 대기 중",
        )

    return commission


async def process_payouts(
    db: AsyncSession,
    min_amount: int = 100,
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
            status="pending",
        )
        db.add(payout)
        payouts_created += 1
        total_amount += amount

    if payouts_created > 0:
        await db.commit()

    return payouts_created, total_amount


async def approve_payout(db: AsyncSession, payout_id: str) -> bool:
    payout = await db.get(ReferralPayout, payout_id)
    if not payout or payout.status != "pending":
        return False

    payout.status = "completed"
    payout.paid_at = datetime.now(timezone.utc).replace(tzinfo=None)

    await db.execute(
        ReferralCommission.__table__.update()
        .where(
            ReferralCommission.referrer_id == payout.referrer_id,
            ReferralCommission.status == "pending",
        )
        .values(status="paid")
    )
    await db.commit()

    referrer = await db.get(Tenant, payout.referrer_id)
    if referrer and referrer.telegram_chat_id:
        await _send_telegram_notification(
            referrer.telegram_chat_id,
            f"✅ {payout.amount}원이 정산 완료되었습니다!\n\n감사합니다.",
        )

    return True


async def cancel_commission(db: AsyncSession, commission_id: str) -> bool:
    commission = await db.get(ReferralCommission, commission_id)
    if not commission or commission.status == "cancelled":
        return False

    commission.status = "cancelled"
    await db.commit()

    referrer = await db.get(Tenant, commission.referrer_id)
    if referrer and referrer.telegram_chat_id:
        await _send_telegram_notification(
            referrer.telegram_chat_id,
            f"⚠️ 커미션이 취소되었습니다.\n금액: {commission.commission_amount}원\n사유: 결제 취소/환불",
        )

    return True


async def cancel_commissions_by_payment(db: AsyncSession, source_payment_id: str) -> int:
    result = await db.execute(
        select(ReferralCommission).where(
            ReferralCommission.source_payment_id == source_payment_id,
            ReferralCommission.status == "pending",
        )
    )
    commissions = list(result.scalars().all())

    cancelled = 0
    for c in commissions:
        c.status = "cancelled"
        cancelled += 1

    if cancelled > 0:
        await db.commit()

    return cancelled


async def get_pending_payouts(db: AsyncSession) -> list[ReferralPayout]:
    result = await db.execute(
        select(ReferralPayout)
        .where(ReferralPayout.status == "pending")
        .order_by(ReferralPayout.created_at.desc())
    )
    return list(result.scalars().all())


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


async def get_stats(db: AsyncSession, days: int = 30) -> dict:
    cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=days)

    result = await db.execute(
        select(
            cast(Tenant.created_at, Date).label("date"),
            func.count(Tenant.id).label("signups"),
        )
        .where(Tenant.created_at >= cutoff)
        .group_by(cast(Tenant.created_at, Date))
        .order_by(cast(Tenant.created_at, Date))
    )
    signup_rows = result.all()
    signup_map = {str(r.date): r.signups for r in signup_rows}

    result = await db.execute(
        select(
            cast(ReferralCommission.created_at, Date).label("date"),
            func.coalesce(func.sum(ReferralCommission.commission_amount), 0).label("total"),
        )
        .where(ReferralCommission.created_at >= cutoff)
        .group_by(cast(ReferralCommission.created_at, Date))
        .order_by(cast(ReferralCommission.created_at, Date))
    )
    commission_rows = result.all()
    commission_map = {str(r.date): r.total for r in commission_rows}

    daily = []
    for i in range(days - 1, -1, -1):
        d = (datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=i)).strftime("%Y-%m-%d")
        daily.append({
            "date": d,
            "signups": signup_map.get(d, 0),
            "commissions": commission_map.get(d, 0),
        })

    total_referrers = await db.execute(
        select(func.count(func.distinct(ReferralCommission.referrer_id)))
    )

    total_referred = await db.execute(
        select(func.count(ReferralCommission.id))
    )

    pending_count = await db.execute(
        select(func.count(ReferralCommission.id))
        .where(ReferralCommission.status == "pending")
    )

    paid_count = await db.execute(
        select(func.count(ReferralCommission.id))
        .where(ReferralCommission.status == "paid")
    )

    pending_amount = await db.execute(
        select(func.coalesce(func.sum(ReferralCommission.commission_amount), 0))
        .where(ReferralCommission.status == "pending")
    )

    paid_amount = await db.execute(
        select(func.coalesce(func.sum(ReferralCommission.commission_amount), 0))
        .where(ReferralCommission.status == "paid")
    )

    return {
        "total_referrers": total_referrers.scalar_one_or_none() or 0,
        "total_referred": total_referred.scalar_one_or_none() or 0,
        "total_commissions_pending": pending_count.scalar_one_or_none() or 0,
        "total_commissions_paid": paid_count.scalar_one_or_none() or 0,
        "total_commission_amount_pending": pending_amount.scalar_one_or_none() or 0,
        "total_commission_amount_paid": paid_amount.scalar_one_or_none() or 0,
        "daily": daily,
    }


def generate_commissions_csv(commissions: list[dict]) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "추천인ID", "추천인전화번호", "추천인전화번호", "결제유형", "결제금액", "수수료율", "수수료금액", "상태", "생성일"])
    for c in commissions:
        writer.writerow([c["id"], c["referrer_id"], c["referrer_phone"], c["referred_user_phone"], c["source_type"], c["amount"], c["commission_rate"], c["commission_amount"], c["status"], str(c["created_at"])])
    return output.getvalue()


def generate_stats_csv(stats: dict) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["지표", "값"])
    writer.writerow(["전체 추천인 수", stats["total_referrers"]])
    writer.writerow(["전체 추천 수", stats["total_referred"]])
    writer.writerow(["대기중 커미션 건수", stats["total_commissions_pending"]])
    writer.writerow(["지급완료 커미션 건수", stats["total_commissions_paid"]])
    writer.writerow(["대기중 커미션 금액", stats["total_commission_amount_pending"]])
    writer.writerow(["지급완료 커미션 금액", stats["total_commission_amount_paid"]])
    writer.writerow([])
    writer.writerow(["일자", "가입자수", "커미션금액"])
    for d in stats["daily"]:
        writer.writerow([d["date"], d["signups"], d["commissions"]])
    return output.getvalue()


async def run_auto_payouts() -> tuple[int, int]:
    from app.database import async_session_maker as _session_maker
    async with _session_maker() as db:
        return await process_payouts(db)


async def _send_telegram_notification(chat_id: str, text: str) -> None:
    if not settings.telegram_bot_token:
        return

    try:
        from telegram import Bot
        bot = Bot(token=settings.telegram_bot_token)
        await bot.send_message(chat_id=chat_id, text=text)
    except Exception as exc:
        logger.warning("telegram_notification_failed", chat_id=chat_id, error=str(exc))


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
