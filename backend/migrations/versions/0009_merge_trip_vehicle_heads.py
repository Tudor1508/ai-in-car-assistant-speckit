"""Merge the trip-history and vehicle-image migration branches."""

revision = "0009_merge_trip_vehicle_heads"
down_revision = ("0006_trip_history", "0008_vehicle_image_upload")
branch_labels = None
depends_on = None


def upgrade() -> None:
    # This revision joins two already-applied schema histories. Both parent
    # migrations keep their own operations; the merge itself changes no schema.
    pass


def downgrade() -> None:
    # Downgrading across the merge lets Alembic downgrade both parent branches.
    pass
