"""Add accounts, server sessions, and anonymous CSRF contexts.

Revision ID: 0002_auth_accounts_sessions
Revises: 0001_foundation
"""

from alembic import op
import sqlalchemy as sa

revision = "0002_auth_accounts_sessions"
down_revision = "0001_foundation"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "accounts",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("email_normalized", sa.String(length=320), nullable=False),
        sa.Column("password_hash", sa.String(length=512), nullable=False),
        sa.Column("role", sa.String(length=16), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("role IN ('user', 'admin', 'producer')", name="ck_accounts_role"),
        sa.CheckConstraint("status IN ('active', 'disabled')", name="ck_accounts_status"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email_normalized", name="uq_accounts_email_normalized"),
    )
    op.create_table(
        "auth_sessions",
        sa.Column("id_digest", sa.String(length=64), nullable=False),
        sa.Column("account_id", sa.String(length=32), nullable=False),
        sa.Column("csrf_token_digest", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id_digest"),
    )
    op.create_table(
        "anonymous_csrf_contexts",
        sa.Column("id_digest", sa.String(length=64), nullable=False),
        sa.Column("csrf_token_digest", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id_digest"),
    )


def downgrade() -> None:
    op.drop_table("anonymous_csrf_contexts")
    op.drop_table("auth_sessions")
    op.drop_table("accounts")
