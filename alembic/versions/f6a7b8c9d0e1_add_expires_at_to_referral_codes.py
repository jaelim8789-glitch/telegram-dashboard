"""add expires_at to referral_codes

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-07-20 03:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine import reflection


revision: str = "f6a7b8c9d0e1"
down_revision: Union[str, None] = "e5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = reflection.Inspector.from_engine(bind)
    try:
        cols = [c["name"] for c in inspector.get_columns("referral_codes")]
        if "expires_at" not in cols:
            op.add_column("referral_codes", sa.Column("expires_at", sa.DateTime(), nullable=True))
    except Exception:
        pass


def downgrade() -> None:
    bind = op.get_bind()
    inspector = reflection.Inspector.from_engine(bind)
    try:
        cols = [c["name"] for c in inspector.get_columns("referral_codes")]
        if "expires_at" in cols:
            op.drop_column("referral_codes", "expires_at")
    except Exception:
        pass
