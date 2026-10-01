from pathlib import Path

import pytest
from sqlalchemy import Column, Integer, MetaData, String, Table, select
from sqlalchemy.orm import Session

from src.data.database import create_engine, create_session_factory, get_database_url


def test_sqlite_store_supports_temporary_write_read_and_cleanup(
    tmp_path: Path, monkeypatch
) -> None:
    database_file = tmp_path / "isolated.sqlite3"
    database_url = f"sqlite:///{database_file.as_posix()}"
    monkeypatch.setenv("DRIVE_WISE_DATABASE_URL", database_url)

    engine = create_engine()
    session_factory = create_session_factory(engine)
    metadata = MetaData()
    fixture_records = Table(
        "fixture_records",
        metadata,
        Column("id", Integer, primary_key=True),
        Column("value", String, nullable=False),
    )

    try:
        metadata.create_all(engine)
        with Session(engine) as session:
            session.execute(fixture_records.insert().values(value="persisted"))
            session.commit()
        with session_factory() as session:
            value = session.scalar(select(fixture_records.c.value))
        assert value == "persisted"
        assert database_file.exists()
    finally:
        engine.dispose()
        database_file.unlink(missing_ok=True)

    assert not database_file.exists()
    assert get_database_url() == database_url


def test_default_store_is_credential_free_and_backend_relative(monkeypatch) -> None:
    monkeypatch.delenv("DRIVE_WISE_DATABASE_URL", raising=False)

    database_url = get_database_url()

    assert database_url.startswith("sqlite:///")
    assert "backend" in database_url.lower()
    assert "data" in database_url.lower()
    assert "@" not in database_url


def test_local_foundation_rejects_non_sqlite_database_url() -> None:
    with pytest.raises(ValueError, match="Only SQLite URLs"):
        create_engine("postgresql://example.invalid/database")
