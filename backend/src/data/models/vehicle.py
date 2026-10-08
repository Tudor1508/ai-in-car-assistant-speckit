from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, LargeBinary, String
from sqlalchemy.orm import Mapped, deferred, mapped_column

from src.data.models.account import utc_now
from src.data.models.base import Base


class Vehicle(Base):
    __tablename__ = "vehicles"
    __table_args__ = (
        CheckConstraint("type IN ('combustion', 'electric')", name="ck_vehicles_type"),
        CheckConstraint("year >= 1886", name="ck_vehicles_year_min"),
        CheckConstraint("range_km >= 0", name="ck_vehicles_range_nonnegative"),
        CheckConstraint("mileage_km >= 0", name="ck_vehicles_mileage_nonnegative"),
        CheckConstraint("brand IS NULL OR length(trim(brand)) BETWEEN 1 AND 120", name="ck_vehicles_brand_trimmed_length"),
        CheckConstraint(
            "(type = 'combustion' AND fuel_type IN ('petrol', 'diesel', 'lpg', 'cng', 'other')) "
            "OR (type = 'electric' AND fuel_type IS NULL)",
            name="ck_vehicles_fuel_matches_type",
        ),
        CheckConstraint(
            "(image_provider IS NULL AND image_file_title IS NULL AND image_url IS NULL "
            "AND image_page_url IS NULL AND image_creator IS NULL "
            "AND image_license_name IS NULL AND image_license_url IS NULL "
            "AND image_match_kind IS NULL) OR "
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
            name="ck_vehicles_image_metadata_complete",
        ),
        Index("ix_vehicles_owner_created", "owner_account_id", "created_at", "id"),
        Index("ix_vehicles_brand_archived_created", "brand", "archived_at", "created_at"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    owner_account_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    model: Mapped[str] = mapped_column(String(80), nullable=False)
    brand: Mapped[str | None] = mapped_column(String(120), nullable=True)
    type: Mapped[str] = mapped_column(String(16), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    range_km: Mapped[int] = mapped_column(Integer, nullable=False)
    mileage_km: Mapped[int] = mapped_column(Integer, nullable=False)
    fuel_type: Mapped[str | None] = mapped_column(String(16), nullable=True)
    image_provider: Mapped[str | None] = mapped_column(String(32), nullable=True)
    image_file_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    image_page_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    image_creator: Mapped[str | None] = mapped_column(String(512), nullable=True)
    image_license_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    image_license_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    image_match_kind: Mapped[str | None] = mapped_column(String(16), nullable=True)
    image_upload_data: Mapped[bytes | None] = deferred(mapped_column(LargeBinary, nullable=True))
    image_upload_mime: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now
    )
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    @property
    def image(self) -> dict[str, str] | None:
        if self.image_provider is None:
            return None
        if self.image_provider == "user_upload":
            return {
                "provider": "user_upload",
                "image_url": f"/vehicles/{self.id}/image-content",
                "match_kind": "uploaded",
            }
        return {
            "provider": self.image_provider,
            "file_title": self.image_file_title or "",
            "image_url": self.image_url or "",
            "file_page_url": self.image_page_url or "",
            "creator": self.image_creator or "",
            "license_name": self.image_license_name or "",
            "license_url": self.image_license_url or "",
            "match_kind": self.image_match_kind or "exact",
        }
