from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from src.data.models.account import utc_now
from src.data.models.base import Base


class TripFavorite(Base):
    __tablename__ = "trip_favorites"
    __table_args__ = (
        CheckConstraint(
            "length(id) = 32 AND id = lower(id) AND id NOT GLOB '*[^0-9a-f]*'",
            name="ck_trip_favorites_id_format",
        ),
        CheckConstraint(
            "length(trim(origin_label)) BETWEEN 1 AND 255",
            name="ck_trip_favorites_origin_label",
        ),
        CheckConstraint(
            "length(trim(destination_label)) BETWEEN 1 AND 255",
            name="ck_trip_favorites_destination_label",
        ),
        CheckConstraint(
            "origin_latitude BETWEEN -90 AND 90",
            name="ck_trip_favorites_origin_latitude",
        ),
        CheckConstraint(
            "origin_longitude BETWEEN -180 AND 180",
            name="ck_trip_favorites_origin_longitude",
        ),
        CheckConstraint(
            "origin_latitude = round(origin_latitude, 6)",
            name="ck_trip_favorites_origin_latitude_precision",
        ),
        CheckConstraint(
            "origin_longitude = round(origin_longitude, 6)",
            name="ck_trip_favorites_origin_longitude_precision",
        ),
        CheckConstraint(
            "destination_latitude BETWEEN -90 AND 90",
            name="ck_trip_favorites_destination_latitude",
        ),
        CheckConstraint(
            "destination_longitude BETWEEN -180 AND 180",
            name="ck_trip_favorites_destination_longitude",
        ),
        CheckConstraint(
            "destination_latitude = round(destination_latitude, 6)",
            name="ck_trip_favorites_destination_latitude_precision",
        ),
        CheckConstraint(
            "destination_longitude = round(destination_longitude, 6)",
            name="ck_trip_favorites_destination_longitude_precision",
        ),
        UniqueConstraint(
            "owner_account_id",
            "origin_latitude",
            "origin_longitude",
            "destination_latitude",
            "destination_longitude",
            name="uq_trip_favorites_owner_endpoints",
        ),
        Index("ix_trip_favorites_owner_created", "owner_account_id", "created_at", "id"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    owner_account_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False
    )
    origin_label: Mapped[str] = mapped_column(String(255), nullable=False)
    origin_latitude: Mapped[Decimal] = mapped_column(Numeric(8, 6), nullable=False)
    origin_longitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    destination_label: Mapped[str] = mapped_column(String(255), nullable=False)
    destination_latitude: Mapped[Decimal] = mapped_column(Numeric(8, 6), nullable=False)
    destination_longitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )
