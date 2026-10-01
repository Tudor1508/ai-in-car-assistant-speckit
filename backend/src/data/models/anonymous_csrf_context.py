from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from src.data.models.account import utc_now
from src.data.models.base import Base


class AnonymousCsrfContext(Base):
    __tablename__ = "anonymous_csrf_contexts"

    id_digest: Mapped[str] = mapped_column(String(64), primary_key=True)
    csrf_token_digest: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
