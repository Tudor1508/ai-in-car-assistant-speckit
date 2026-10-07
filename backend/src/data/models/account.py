from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, DateTime, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from src.data.models.base import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Account(Base):
    __tablename__ = "accounts"
    __table_args__ = (
        UniqueConstraint("email_normalized", name="uq_accounts_email_normalized"),
        CheckConstraint(
            "role IN ('user', 'admin', 'producer')", name="ck_accounts_role"
        ),
        CheckConstraint("status IN ('active', 'disabled')", name="ck_accounts_status"),
        UniqueConstraint("admin_slot", name="uq_accounts_admin_slot"),
        CheckConstraint("(role = 'admin' AND admin_slot = 'primary') OR (role != 'admin' AND admin_slot IS NULL)", name="ck_accounts_admin_slot_role"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    email_normalized: Mapped[str] = mapped_column(String(320), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(512), nullable=False)
    role: Mapped[str] = mapped_column(String(16), nullable=False, default="user")
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="active")
    brand: Mapped[str | None] = mapped_column(String(120), nullable=True)
    admin_slot: Mapped[str | None] = mapped_column(String(16), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now
    )
