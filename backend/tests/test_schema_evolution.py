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
            "accounts", "alembic_version", "anonymous_csrf_contexts", "auth_sessions",
            "trip_favorites", "trip_history", "vehicles"
        ]
        history_columns = {column["name"] for column in inspector.get_columns("trip_history")}
        assert {"id", "owner_account_id", "created_at", "vehicle_snapshot", "route_snapshot", "distance_m", "duration_s"}.issubset(history_columns)
        assert "ix_trip_history_owner_created" in {index["name"] for index in inspector.get_indexes("trip_history")}
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
            "accounts", "alembic_version", "anonymous_csrf_contexts", "auth_sessions",
            "trip_favorites", "trip_history", "vehicles"
        ]
        assert "ix_trip_history_owner_created" in {index["name"] for index in inspect(engine).get_indexes("trip_history")}
    finally:
        engine.dispose()


def test_trip_history_migration_downgrade_drops_only_history(tmp_path: Path) -> None:
    database_file = tmp_path / "history-downgrade.sqlite3"
    config = _alembic_config(f"sqlite:///{database_file.as_posix()}")
    command.upgrade(config, "head")
    command.downgrade(config, "0005_admin_dashboard")
    engine = create_engine(f"sqlite:///{database_file.as_posix()}")
    try:
        tables = set(inspect(engine).get_table_names())
        assert "trip_history" not in tables
        assert {"accounts", "vehicles", "trip_favorites"}.issubset(tables)
    finally:
        engine.dispose()


def test_trip_history_upgrade_preserves_existing_account_rows(tmp_path: Path) -> None:
    database_file = tmp_path / "history-preserve.sqlite3"
    config = _alembic_config(f"sqlite:///{database_file.as_posix()}")
    command.upgrade(config, "0005_admin_dashboard")
    engine = create_engine(f"sqlite:///{database_file.as_posix()}")
    try:
        with engine.begin() as connection:
            connection.execute(text("""
                INSERT INTO accounts (id, name, email, email_normalized, password_hash, role, status,
                                      created_at, updated_at, brand, admin_slot)
                VALUES ('a' || printf('%031d', 1), 'Existing', 'existing@example.com',
                        'existing@example.com', 'test-hash', 'user', 'active',
                        '2026-01-01T00:00:00', '2026-01-01T00:00:00', NULL, NULL)
            """))
        command.upgrade(config, "head")
        with engine.connect() as connection:
            assert connection.scalar(text("SELECT name FROM accounts WHERE email_normalized = 'existing@example.com'")) == "Existing"
            assert connection.scalar(text("SELECT count(*) FROM trip_history")) == 0
    finally:
        engine.dispose()
