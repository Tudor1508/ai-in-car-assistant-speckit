from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text


def config_for(database_url: str) -> Config:
    backend = Path(__file__).resolve().parents[1]
    config = Config(str(backend / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", database_url.replace("%", "%%"))
    return config


def test_fresh_database_upgrades_with_empty_singleton_slot(tmp_path):
    database_url = f"sqlite:///{(tmp_path / 'fresh.sqlite3').as_posix()}"
    config = config_for(database_url)
    command.upgrade(config, "head")
    engine = create_engine(database_url)
    with engine.connect() as connection:
        assert connection.scalar(text("SELECT count(*) FROM accounts WHERE admin_slot IS NOT NULL")) == 0
    engine.dispose()


def seed_legacy_rows(database_url: str, two_admins: bool = False) -> None:
    engine = create_engine(database_url)
    with engine.begin() as connection:
        roles = ["admin", "admin" if two_admins else "producer"]
        for index, role in enumerate(roles):
            account_id = str(index + 1) * 32
            email = f"legacy{index}@example.test"
            connection.execute(text("""
                INSERT INTO accounts (id, name, email, email_normalized, password_hash, role, status, created_at, updated_at)
                VALUES (:id, :name, :email, :normalized, 'verifier', :role, :status, '2026-01-01', '2026-01-01')
            """), {"id": account_id, "name": "Legacy", "email": email, "normalized": email, "role": role, "status": "active"})
        connection.execute(text("""
            INSERT INTO vehicles (id, owner_account_id, name, model, type, year, range_km, mileage_km, fuel_type, created_at, updated_at)
            VALUES (:id, :owner, 'Legacy car', 'Model', 'electric', 2024, 300, 100, NULL, '2026-01-01', '2026-01-01')
        """), {"id": "a" * 32, "owner": "2" * 32})
        connection.execute(text("""
            INSERT INTO trip_favorites (id, owner_account_id, origin_label, origin_latitude, origin_longitude, destination_label, destination_latitude, destination_longitude, created_at)
            VALUES (:id, :owner, 'Origin', 44.426800, 26.102500, 'Destination', 46.771200, 23.623600, '2026-01-01')
        """), {"id": "c" * 32, "owner": "2" * 32})
    engine.dispose()


def test_migration_preserves_legacy_rows_and_backfills_one_admin(tmp_path):
    database_url = f"sqlite:///{(tmp_path / 'legacy.sqlite3').as_posix()}"
    config = config_for(database_url)
    command.upgrade(config, "0004_trip_favorites")
    seed_legacy_rows(database_url)
    command.upgrade(config, "head")
    engine = create_engine(database_url)
    with engine.connect() as connection:
        assert connection.scalar(text("SELECT admin_slot FROM accounts WHERE role = 'admin'")) == "primary"
        assert connection.scalar(text("SELECT brand FROM accounts WHERE role = 'producer'")) is None
        assert connection.scalar(text("SELECT count(*) FROM accounts")) == 2
        assert connection.scalar(text("SELECT count(*) FROM vehicles")) == 1
        assert connection.scalar(text("SELECT count(*) FROM trip_favorites")) == 1
    engine.dispose()
    command.downgrade(config, "0004_trip_favorites")
    engine = create_engine(database_url)
    with engine.connect() as connection:
        assert connection.scalar(text("SELECT count(*) FROM vehicles")) == 1
        assert connection.scalar(text("SELECT count(*) FROM trip_favorites")) == 1
    engine.dispose()
    command.upgrade(config, "head")


def test_migration_fails_without_demoting_multiple_existing_admins(tmp_path):
    database_url = f"sqlite:///{(tmp_path / 'multiple.sqlite3').as_posix()}"
    config = config_for(database_url)
    command.upgrade(config, "0004_trip_favorites")
    seed_legacy_rows(database_url, two_admins=True)
    with pytest.raises(RuntimeError, match="Multiple admin accounts"):
        command.upgrade(config, "head")
