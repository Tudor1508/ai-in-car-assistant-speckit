from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from src.data.models.account import utc_now
from src.data.models.base import Base


class Vehicle(Base):
    __tablename__ = "vehicles"
    __table_args__ = (
        CheckConstraint("type IN ('combustion', 'electric')", name="ck_vehicles_type"),
        CheckConstraint("year >= 1886", name="ck_vehicles_year_min"),
        CheckConstraint("range_km >= 0", name="ck_vehicles_range_nonnegative"),
        CheckConstraint("mileage_km >= 0", name="ck_vehicles_mileage_nonnegative"),
        CheckConstraint(
            "(type = 'combustion' AND fuel_type IN ('petrol', 'diesel', 'lpg', 'cng', 'other')) "
            "OR (type = 'electric' AND fuel_type IS NULL)",
            name="ck_vehicles_fuel_matches_type",
        ),
        Index("ix_vehicles_owner_created", "owner_account_id", "created_at", "id"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    owner_account_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    model: Mapped[str] = mapped_column(String(80), nullable=False)
    type: Mapped[str] = mapped_column(String(16), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    range_km: Mapped[int] = mapped_column(Integer, nullable=False)
    mileage_km: Mapped[int] = mapped_column(Integer, nullable=False)
    fuel_type: Mapped[str | None] = mapped_column(String(16), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now
    )
