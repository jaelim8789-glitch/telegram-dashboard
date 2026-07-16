"""add broadcast_campaigns and broadcast_schedule_entries tables

Revision ID: b1d2e3f4a5b6
Revises: merge_session_and_inline_buttons
Create Date: 2026-07-17 04:01:44.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b1d2e3f4a5b6"
down_revision: Union[str, Sequence[str], None] = "merge_session_and_inline_buttons"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ─── Broadcast Campaigns (캠페인) ─────────────────────────────────
    op.create_table(
        "broadcast_campaigns",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("tenant_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="draft"),
        sa.Column("account_ids", sa.JSON(), nullable=False),
        sa.Column("recipient_groups", sa.JSON(), nullable=False),
        sa.Column("message_template_id", sa.String(length=36), nullable=True),
        sa.Column("scheduled_start", sa.DateTime(), nullable=True),
        sa.Column("scheduled_end", sa.DateTime(), nullable=True),
        sa.Column("delivery_mode", sa.String(length=20), nullable=False, server_default="normal"),
        sa.Column("total_recipients", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("sent_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("success_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["message_template_id"], ["message_templates.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_broadcast_campaigns_tenant_id"),
        "broadcast_campaigns",
        ["tenant_id"],
        unique=False,
    )

    # ─── Broadcast Schedule Entries (일정/달력 뷰) ───────────────────
    op.create_table(
        "broadcast_schedule_entries",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("tenant_id", sa.String(length=36), nullable=False),
        sa.Column("broadcast_id", sa.String(length=36), nullable=True),
        sa.Column("campaign_id", sa.String(length=36), nullable=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["broadcast_id"], ["broadcasts.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["campaign_id"], ["broadcast_campaigns.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_broadcast_schedule_entries_tenant_id"),
        "broadcast_schedule_entries",
        ["tenant_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_broadcast_schedule_entries_scheduled_at"),
        "broadcast_schedule_entries",
        ["scheduled_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_broadcast_schedule_entries_scheduled_at"),
        table_name="broadcast_schedule_entries",
    )
    op.drop_index(
        op.f("ix_broadcast_schedule_entries_tenant_id"),
        table_name="broadcast_schedule_entries",
    )
    op.drop_table("broadcast_schedule_entries")

    op.drop_index(
        op.f("ix_broadcast_campaigns_tenant_id"),
        table_name="broadcast_campaigns",
    )
    op.drop_table("broadcast_campaigns")
