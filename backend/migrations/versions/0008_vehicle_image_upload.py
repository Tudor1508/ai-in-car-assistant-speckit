"""Store an owner-uploaded vehicle photo as the preferred vehicle image."""

from alembic import op
import sqlalchemy as sa


revision = "0008_vehicle_image_upload"
down_revision = "0007_vehicle_image_match_kind"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("vehicles", sa.Column("image_upload_data", sa.LargeBinary(), nullable=True))
    op.add_column("vehicles", sa.Column("image_upload_mime", sa.String(length=32), nullable=True))
    with op.batch_alter_table("vehicles") as batch:
        batch.drop_constraint("ck_vehicles_image_metadata_complete", type_="check")
        batch.create_check_constraint(
            "ck_vehicles_image_metadata_complete",
            "(image_provider IS NULL AND image_file_title IS NULL AND image_url IS NULL "
            "AND image_page_url IS NULL AND image_creator IS NULL "
            "AND image_license_name IS NULL AND image_license_url IS NULL "
            "AND image_match_kind IS NULL AND image_upload_data IS NULL "
            "AND image_upload_mime IS NULL) OR "
            "(image_provider = 'wikimedia_commons' AND image_file_title IS NOT NULL "
            "AND image_url IS NOT NULL AND image_page_url IS NOT NULL "
            "AND image_creator IS NOT NULL AND image_license_name IS NOT NULL "
            "AND image_license_url IS NOT NULL "
            "AND image_match_kind IN ('exact', 'similar') "
            "AND image_upload_data IS NULL AND image_upload_mime IS NULL) OR "
            "(image_provider = 'user_upload' AND image_file_title IS NULL "
            "AND image_url IS NULL AND image_page_url IS NULL AND image_creator IS NULL "
            "AND image_license_name IS NULL AND image_license_url IS NULL "
            "AND image_match_kind IS NULL AND image_upload_data IS NOT NULL "
            "AND image_upload_mime IN ('image/jpeg', 'image/png', 'image/webp'))",
        )


def downgrade() -> None:
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
        batch.drop_column("image_upload_mime")
        batch.drop_column("image_upload_data")
