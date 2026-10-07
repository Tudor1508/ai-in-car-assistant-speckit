"""Record whether a Commons vehicle image is exact or similar."""

from alembic import op
import sqlalchemy as sa


revision = "0007_vehicle_image_match_kind"
down_revision = "0006_vehicle_image_preview"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("vehicles", sa.Column("image_match_kind", sa.String(length=16), nullable=True))
    # Existing associations were created under the previous exact-match policy.
    op.execute("UPDATE vehicles SET image_match_kind = 'exact' WHERE image_provider IS NOT NULL")
    with op.batch_alter_table("vehicles") as batch:
        batch.drop_constraint("ck_vehicles_image_metadata_complete", type_="check")
        batch.create_check_constraint(
            "ck_vehicles_image_metadata_complete",
            "(image_provider IS NULL AND image_file_title IS NULL AND image_url IS NULL "
            "AND image_page_url IS NULL AND image_creator IS NULL "
            "AND image_license_name IS NULL AND image_license_url IS NULL "
            "AND image_match_kind IS NULL) OR "
            "(image_provider = 'wikimedia_commons' AND image_file_title IS NOT NULL "
            "AND image_url IS NOT NULL AND image_page_url IS NOT NULL "
            "AND image_creator IS NOT NULL AND image_license_name IS NOT NULL "
            "AND image_license_url IS NOT NULL "
            "AND image_match_kind IN ('exact', 'similar'))",
        )


def downgrade() -> None:
    with op.batch_alter_table("vehicles") as batch:
        batch.drop_constraint("ck_vehicles_image_metadata_complete", type_="check")
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
        batch.drop_column("image_match_kind")
