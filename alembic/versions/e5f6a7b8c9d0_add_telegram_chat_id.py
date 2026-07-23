"""add telegram_chat_id to tenants

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-07-20 02:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine import reflection


revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = reflection.Inspector.from_engine(bind)
    try:
        cols = [c["name"] for c in inspector.get_columns("tenants")]
        if "telegram_chat_id" not in cols:
            op.add_column("tenants", sa.Column("telegram_chat_id", sa.String(length=50), nullable=True))
    except Exception:
        pass


def downgrade() -> None:
    bind = op.get_bind()
    inspector = reflection.Inspector.from_engine(bind)
    try:
        cols = [c["name"] for c in inspector.get_columns("tenants")]
        if "telegram_chat_id" in cols:
            op.drop_column("tenants", "telegram_chat_id")
    except Exception:
        pass
