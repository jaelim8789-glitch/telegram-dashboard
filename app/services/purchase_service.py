import secrets

from app.models.tenant import Tenant


class PurchaseConflict(Exception):
    pass


def generate_payment_ref() -> str:
    return f"TM-{secrets.token_hex(4).upper()}"


async def upsert_pending_tenant(db, plan: str, payment_ref: str, phone: str = "") -> Tenant:
    from sqlalchemy import select
    result = await db.execute(select(Tenant).where(Tenant.phone == phone))
    tenant = result.scalar_one_or_none()
    if not tenant:
        tenant = Tenant(
            phone=phone or f"pending-{payment_ref}",
            plan=plan,
            subscription_status="pending",
            payment_ref=payment_ref,
        )
        db.add(tenant)
    else:
        if tenant.subscription_status == "active":
            raise PurchaseConflict("이미 활성화된 요금제가 있습니다.")
        tenant.plan = plan
        tenant.subscription_status = "pending"
        tenant.payment_ref = payment_ref
    await db.flush()
    return tenant
