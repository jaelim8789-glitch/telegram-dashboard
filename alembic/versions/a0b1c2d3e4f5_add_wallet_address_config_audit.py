"""add wallet_address, referral_config, referral_audit_logs

Revision ID: a0b1c2d3e4f5
Revises: f6a7b8c9d0e1
Create Date: 2026-07-20 04:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine import reflection


revision: str = "a0b1c2d3e4f5"
down_revision: Union[str, None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(bind, table, column):
    inspector = reflection.Inspector.from_engine(bind)
    try:
        return column in {c["name"] for c in inspector.get_columns(table)}
    except Exception:
        return False


def _has_table(bind, table):
    inspector = reflection.Inspector.from_engine(bind)
    try:
        return table in inspector.get_table_names()
    except Exception:
        return False


def upgrade() -> None:
    bind = op.get_bind()

    if not _has_column(bind, "tenants", "wallet_address"):
        op.add_column("tenants", sa.Column("wallet_address", sa.String(length=100), nullable=True))

    if not _has_table(bind, "referral_config"):
        op.create_table(
            "referral_config",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("key", sa.String(length=50), nullable=False),
            sa.Column("value", sa.String(length=255), nullable=False),
            sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_referral_config_key"), "referral_config", ["key"], unique=True)

    if not _has_table(bind, "referral_audit_logs"):
        op.create_table(
            "referral_audit_logs",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("action", sa.String(length=50), nullable=False),
            sa.Column("actor_id", sa.String(length=36), nullable=True),
            sa.Column("target_id", sa.String(length=36), nullable=True),
            sa.Column("details", sa.String(length=500), nullable=False, server_default=""),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_referral_audit_logs_action"), "referral_audit_logs", ["action"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()

    if _has_table(bind, "referral_audit_logs"):
        op.drop_index(op.f("ix_referral_audit_logs_action"), table_name="referral_audit_logs")
        op.drop_table("referral_audit_logs")
    if _has_table(bind, "referral_config"):
        op.drop_index(op.f("ix_referral_config_key"), table_name="referral_config")
        op.drop_table("referral_config")
    if _has_column(bind, "tenants", "wallet_address"):
        op.drop_column("tenants", "wallet_address")
