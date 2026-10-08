"""Merge producer-dashboard and trip/vehicle migration heads."""

revision = "0010_merge_producer_vehicle_heads"
down_revision = ("0009_merge_trip_vehicle_heads", "0009_producer_dashboard")
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Both parent revisions already contain their schema changes.
    pass


def downgrade() -> None:
    # The merge itself introduces no schema changes.
    pass
