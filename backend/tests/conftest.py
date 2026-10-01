from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine

from src.data.database import create_engine
from src.data.models import Base
from src.main import create_app


@pytest.fixture
def auth_engine(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[Engine]:
    database_file = tmp_path / "auth-test.sqlite3"
    database_url = f"sqlite:///{database_file.as_posix()}"
    monkeypatch.setenv("DRIVE_WISE_DATABASE_URL", database_url)
    monkeypatch.setenv("DRIVE_WISE_ALLOWED_ORIGINS", "https://testserver")
    engine = create_engine(database_url)
    Base.metadata.create_all(engine)
    try:
        yield engine
    finally:
        engine.dispose()


@pytest.fixture
def auth_client(auth_engine: Engine) -> Iterator[TestClient]:
    app = create_app(engine=auth_engine)
    with TestClient(app, base_url="https://testserver") as client:
        yield client


@pytest.fixture
def session_factory(auth_engine: Engine):
    from src.data.database import create_session_factory

    return create_session_factory(auth_engine)
