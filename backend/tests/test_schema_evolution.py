from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text


def _alembic_config(database_url: str) -> Config:
    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", database_url.replace("%", "%%"))
    return config


def test_fresh_store_upgrade_creates_current_application_schema(tmp_path: Path) -> None:
    database_file = tmp_path / "fresh.sqlite3"
    config = _alembic_config(f"sqlite:///{database_file.as_posix()}")

    command.upgrade(config, "head")

    engine = create_engine(f"sqlite:///{database_file.as_posix()}")
    try:
        inspector = inspect(engine)
        assert inspector.get_table_names() == [
            "accounts", "alembic_version", "anonymous_csrf_contexts", "auth_sessions", "vehicles"
        ]
        assert inspector.get_columns("alembic_version")
        with engine.connect() as connection:
            assert connection.scalar(text("SELECT version_num FROM alembic_version"))
    finally:
        engine.dispose()


def test_current_store_can_be_upgraded_repeatedly(tmp_path: Path) -> None:
    database_file = tmp_path / "current.sqlite3"
    config = _alembic_config(f"sqlite:///{database_file.as_posix()}")

    command.upgrade(config, "head")
    command.upgrade(config, "head")

    engine = create_engine(f"sqlite:///{database_file.as_posix()}")
    try:
        assert inspect(engine).get_table_names() == [
            "accounts", "alembic_version", "anonymous_csrf_contexts", "auth_sessions", "vehicles"
        ]
    finally:
        engine.dispose()
