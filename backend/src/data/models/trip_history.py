from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, JSON, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from src.data.models.account import utc_now
from src.data.models.base import Base


class TripHistory(Base):
    __tablename__ = "trip_history"
    __table_args__ = (
        CheckConstraint("length(id) = 32 AND id = lower(id) AND id NOT GLOB '*[^0-9a-f]*'", name="ck_trip_history_id_format"),
        CheckConstraint("length(trim(origin_label)) BETWEEN 1 AND 255", name="ck_trip_history_origin_label"),
        CheckConstraint("length(trim(destination_label)) BETWEEN 1 AND 255", name="ck_trip_history_destination_label"),
        CheckConstraint("origin_latitude BETWEEN -90 AND 90", name="ck_trip_history_origin_latitude"),
        CheckConstraint("origin_longitude BETWEEN -180 AND 180", name="ck_trip_history_origin_longitude"),
        CheckConstraint("destination_latitude BETWEEN -90 AND 90", name="ck_trip_history_destination_latitude"),
        CheckConstraint("destination_longitude BETWEEN -180 AND 180", name="ck_trip_history_destination_longitude"),
        CheckConstraint("route_preference IN ('fastest', 'shortest', 'scenic')", name="ck_trip_history_route_preference"),
        CheckConstraint("distance_m >= 0", name="ck_trip_history_distance_nonnegative"),
        CheckConstraint("duration_s >= 0", name="ck_trip_history_duration_nonnegative"),
        Index("ix_trip_history_owner_created", "owner_account_id", "created_at", "id"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    owner_account_id: Mapped[str] = mapped_column(String(32), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    origin_label: Mapped[str] = mapped_column(String(255), nullable=False)
    origin_latitude: Mapped[Decimal] = mapped_column(Numeric(8, 6), nullable=False)
    origin_longitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    destination_label: Mapped[str] = mapped_column(String(255), nullable=False)
    destination_latitude: Mapped[Decimal] = mapped_column(Numeric(8, 6), nullable=False)
    destination_longitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    vehicle_id: Mapped[str] = mapped_column(String(32), nullable=False)
    vehicle_snapshot: Mapped[dict] = mapped_column(JSON, nullable=False)
    route_preference: Mapped[str] = mapped_column(String(16), nullable=False)
    distance_m: Mapped[float] = mapped_column(Numeric, nullable=False)
    duration_s: Mapped[float] = mapped_column(Numeric, nullable=False)
    route_snapshot: Mapped[dict] = mapped_column(JSON, nullable=False)
