"""Persist immutable owner-scoped trip snapshots."""
from alembic import op
import sqlalchemy as sa

revision = "0006_trip_history"
down_revision = "0005_admin_dashboard"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "trip_history",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("owner_account_id", sa.String(32), sa.ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("origin_label", sa.String(255), nullable=False),
        sa.Column("origin_latitude", sa.Numeric(8, 6), nullable=False),
        sa.Column("origin_longitude", sa.Numeric(9, 6), nullable=False),
        sa.Column("destination_label", sa.String(255), nullable=False),
        sa.Column("destination_latitude", sa.Numeric(8, 6), nullable=False),
        sa.Column("destination_longitude", sa.Numeric(9, 6), nullable=False),
        sa.Column("vehicle_id", sa.String(32), nullable=False),
        sa.Column("vehicle_snapshot", sa.JSON(), nullable=False),
        sa.Column("route_preference", sa.String(16), nullable=False),
        sa.Column("distance_m", sa.Numeric(), nullable=False),
        sa.Column("duration_s", sa.Numeric(), nullable=False),
        sa.Column("route_snapshot", sa.JSON(), nullable=False),
        sa.CheckConstraint("length(id) = 32 AND id = lower(id) AND id NOT GLOB '*[^0-9a-f]*'", name="ck_trip_history_id_format"),
        sa.CheckConstraint("length(trim(origin_label)) BETWEEN 1 AND 255", name="ck_trip_history_origin_label"),
        sa.CheckConstraint("length(trim(destination_label)) BETWEEN 1 AND 255", name="ck_trip_history_destination_label"),
        sa.CheckConstraint("origin_latitude BETWEEN -90 AND 90", name="ck_trip_history_origin_latitude"),
        sa.CheckConstraint("origin_longitude BETWEEN -180 AND 180", name="ck_trip_history_origin_longitude"),
        sa.CheckConstraint("destination_latitude BETWEEN -90 AND 90", name="ck_trip_history_destination_latitude"),
        sa.CheckConstraint("destination_longitude BETWEEN -180 AND 180", name="ck_trip_history_destination_longitude"),
        sa.CheckConstraint("route_preference IN ('fastest', 'shortest', 'scenic')", name="ck_trip_history_route_preference"),
        sa.CheckConstraint("distance_m >= 0", name="ck_trip_history_distance_nonnegative"),
        sa.CheckConstraint("duration_s >= 0", name="ck_trip_history_duration_nonnegative"),
    )
    op.create_index("ix_trip_history_owner_created", "trip_history", ["owner_account_id", "created_at", "id"])


def downgrade() -> None:
    op.drop_index("ix_trip_history_owner_created", table_name="trip_history")
    op.drop_table("trip_history")
