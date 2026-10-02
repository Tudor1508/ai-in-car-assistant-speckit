"""Add account-owned favorite trip endpoints.

Revision ID: 0004_trip_favorites
Revises: 0003_vehicles
"""

from alembic import op
import sqlalchemy as sa

revision = "0004_trip_favorites"
down_revision = "0003_vehicles"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "trip_favorites",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("owner_account_id", sa.String(length=32), nullable=False),
        sa.Column("origin_label", sa.String(length=255), nullable=False),
        sa.Column("origin_latitude", sa.Numeric(precision=8, scale=6), nullable=False),
        sa.Column("origin_longitude", sa.Numeric(precision=9, scale=6), nullable=False),
        sa.Column("destination_label", sa.String(length=255), nullable=False),
        sa.Column("destination_latitude", sa.Numeric(precision=8, scale=6), nullable=False),
        sa.Column("destination_longitude", sa.Numeric(precision=9, scale=6), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("length(id) = 32 AND id = lower(id) AND id NOT GLOB '*[^0-9a-f]*'", name="ck_trip_favorites_id_format"),
        sa.CheckConstraint("length(trim(origin_label)) BETWEEN 1 AND 255", name="ck_trip_favorites_origin_label"),
        sa.CheckConstraint("length(trim(destination_label)) BETWEEN 1 AND 255", name="ck_trip_favorites_destination_label"),
        sa.CheckConstraint("origin_latitude BETWEEN -90 AND 90", name="ck_trip_favorites_origin_latitude"),
        sa.CheckConstraint("origin_longitude BETWEEN -180 AND 180", name="ck_trip_favorites_origin_longitude"),
        sa.CheckConstraint("origin_latitude = round(origin_latitude, 6)", name="ck_trip_favorites_origin_latitude_precision"),
        sa.CheckConstraint("origin_longitude = round(origin_longitude, 6)", name="ck_trip_favorites_origin_longitude_precision"),
        sa.CheckConstraint("destination_latitude BETWEEN -90 AND 90", name="ck_trip_favorites_destination_latitude"),
        sa.CheckConstraint("destination_longitude BETWEEN -180 AND 180", name="ck_trip_favorites_destination_longitude"),
        sa.CheckConstraint("destination_latitude = round(destination_latitude, 6)", name="ck_trip_favorites_destination_latitude_precision"),
        sa.CheckConstraint("destination_longitude = round(destination_longitude, 6)", name="ck_trip_favorites_destination_longitude_precision"),
        sa.ForeignKeyConstraint(["owner_account_id"], ["accounts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "owner_account_id", "origin_latitude", "origin_longitude",
            "destination_latitude", "destination_longitude",
            name="uq_trip_favorites_owner_endpoints",
        ),
    )
    op.create_index(
        "ix_trip_favorites_owner_created",
        "trip_favorites",
        ["owner_account_id", "created_at", "id"],
    )


def downgrade() -> None:
    op.drop_index("ix_trip_favorites_owner_created", table_name="trip_favorites")
    op.drop_table("trip_favorites")
