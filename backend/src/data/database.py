import os
from pathlib import Path
from typing import Iterator

from sqlalchemy import Engine, create_engine as sqlalchemy_create_engine, event
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session, sessionmaker

BACKEND_DIR = Path(__file__).resolve().parents[2]
DEFAULT_DATABASE_PATH = BACKEND_DIR / "data" / "drive_wise.sqlite3"


def get_database_url() -> str:
    """Return the configured SQLite URL or backend-relative local default."""
    return os.environ.get(
        "DRIVE_WISE_DATABASE_URL",
        f"sqlite:///{DEFAULT_DATABASE_PATH.as_posix()}",
    )


def create_engine(database_url: str | None = None) -> Engine:
    """Create the shared SQLAlchemy engine without connecting eagerly."""
    url = make_url(database_url or get_database_url())
    if url.get_backend_name() != "sqlite":
        raise ValueError("Only SQLite URLs are supported by the local data foundation")
    if url.database not in (None, ":memory:"):
        Path(url.database).parent.mkdir(parents=True, exist_ok=True)
        engine = sqlalchemy_create_engine(url, connect_args={"check_same_thread": False})
    else:
        engine = sqlalchemy_create_engine(url)
    if engine.dialect.name == "sqlite":
        @event.listens_for(engine, "connect")
        def enable_foreign_keys(connection, _record) -> None:
            cursor = connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()
    return engine


def create_session_factory(engine: Engine | None = None) -> sessionmaker[Session]:
    """Create sessions bound to the supplied or configured engine."""
    return sessionmaker(bind=engine or create_engine(), expire_on_commit=False)


def session_scope() -> Iterator[Session]:
    """Yield a session and reliably close it after use."""
    engine = create_engine()
    session = create_session_factory(engine)()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()
