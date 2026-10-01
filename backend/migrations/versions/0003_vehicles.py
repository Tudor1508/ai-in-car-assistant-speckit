"""Add owner-scoped vehicle records.

Revision ID: 0003_vehicles
Revises: 0002_auth_accounts_sessions
"""

from alembic import op
import sqlalchemy as sa

revision = "0003_vehicles"
down_revision = "0002_auth_accounts_sessions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "vehicles",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("owner_account_id", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("model", sa.String(length=80), nullable=False),
        sa.Column("type", sa.String(length=16), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("range_km", sa.Integer(), nullable=False),
        sa.Column("mileage_km", sa.Integer(), nullable=False),
        sa.Column("fuel_type", sa.String(length=16), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("type IN ('combustion', 'electric')", name="ck_vehicles_type"),
        sa.CheckConstraint("year >= 1886", name="ck_vehicles_year_min"),
        sa.CheckConstraint("range_km >= 0", name="ck_vehicles_range_nonnegative"),
        sa.CheckConstraint("mileage_km >= 0", name="ck_vehicles_mileage_nonnegative"),
        sa.CheckConstraint(
            "(type = 'combustion' AND fuel_type IN ('petrol', 'diesel', 'lpg', 'cng', 'other')) "
            "OR (type = 'electric' AND fuel_type IS NULL)",
            name="ck_vehicles_fuel_matches_type",
        ),
        sa.ForeignKeyConstraint(["owner_account_id"], ["accounts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_vehicles_owner_created",
        "vehicles",
        ["owner_account_id", "created_at", "id"],
    )


def downgrade() -> None:
    op.drop_index("ix_vehicles_owner_created", table_name="vehicles")
    op.drop_table("vehicles")
