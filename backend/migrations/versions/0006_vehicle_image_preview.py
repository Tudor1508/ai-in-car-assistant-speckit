"""Add optional Wikimedia Commons metadata to owned vehicles."""

from alembic import op
import sqlalchemy as sa


revision = "0006_vehicle_image_preview"
down_revision = "0005_admin_dashboard"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("vehicles", sa.Column("image_provider", sa.String(length=32), nullable=True))
    op.add_column("vehicles", sa.Column("image_file_title", sa.String(length=255), nullable=True))
    op.add_column("vehicles", sa.Column("image_url", sa.String(length=2048), nullable=True))
    op.add_column("vehicles", sa.Column("image_page_url", sa.String(length=2048), nullable=True))
    op.add_column("vehicles", sa.Column("image_creator", sa.String(length=512), nullable=True))
    op.add_column("vehicles", sa.Column("image_license_name", sa.String(length=160), nullable=True))
    op.add_column("vehicles", sa.Column("image_license_url", sa.String(length=2048), nullable=True))
    with op.batch_alter_table("vehicles") as batch:
        batch.create_check_constraint(
            "ck_vehicles_image_metadata_complete",
            "(image_provider IS NULL AND image_file_title IS NULL AND image_url IS NULL "
            "AND image_page_url IS NULL AND image_creator IS NULL "
            "AND image_license_name IS NULL AND image_license_url IS NULL) OR "
            "(image_provider = 'wikimedia_commons' AND image_file_title IS NOT NULL "
            "AND image_url IS NOT NULL AND image_page_url IS NOT NULL "
            "AND image_creator IS NOT NULL AND image_license_name IS NOT NULL "
            "AND image_license_url IS NOT NULL)",
        )


def downgrade() -> None:
    with op.batch_alter_table("vehicles") as batch:
        batch.drop_constraint("ck_vehicles_image_metadata_complete", type_="check")
        batch.drop_column("image_license_url")
        batch.drop_column("image_license_name")
        batch.drop_column("image_creator")
        batch.drop_column("image_page_url")
        batch.drop_column("image_url")
        batch.drop_column("image_file_title")
        batch.drop_column("image_provider")
