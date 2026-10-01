from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect


def test_vehicle_migration_creates_expected_schema(tmp_path: Path, monkeypatch):
    backend_dir = Path(__file__).resolve().parents[1]
    database_file = tmp_path / "vehicle-migration.sqlite3"
    monkeypatch.setenv("DRIVE_WISE_DATABASE_URL", f"sqlite:///{database_file.as_posix()}")
    config = Config(str(backend_dir / "alembic.ini"))
    command.upgrade(config, "head")

    from src.data.database import create_engine

    engine = create_engine(f"sqlite:///{database_file.as_posix()}")
    try:
        inspector = inspect(engine)
        assert "vehicles" in inspector.get_table_names()
        columns = {column["name"] for column in inspector.get_columns("vehicles")}
        assert {"id", "owner_account_id", "name", "model", "type", "year", "range_km", "mileage_km", "fuel_type", "created_at", "updated_at"}.issubset(columns)
        assert "ix_vehicles_owner_created" in {index["name"] for index in inspector.get_indexes("vehicles")}
    finally:
        engine.dispose()
