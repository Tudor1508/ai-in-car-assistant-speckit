"""Add vehicle brands and archive lifecycle for Producer reporting."""

from alembic import op
import sqlalchemy as sa


revision = "0009_producer_dashboard"
down_revision = ("0006_trip_history", "0008_vehicle_image_upload")
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("vehicles") as batch:
        batch.add_column(sa.Column("brand", sa.String(length=120), nullable=True))
        batch.add_column(sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True))
        batch.create_check_constraint(
            "ck_vehicles_brand_trimmed_length",
            "brand IS NULL OR length(trim(brand)) BETWEEN 1 AND 120",
        )
    op.create_index(
        "ix_vehicles_brand_archived_created",
        "vehicles",
        ["brand", "archived_at", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_vehicles_brand_archived_created", table_name="vehicles")
    with op.batch_alter_table("vehicles") as batch:
        batch.drop_constraint("ck_vehicles_brand_trimmed_length", type_="check")
        batch.drop_column("archived_at")
        batch.drop_column("brand")
