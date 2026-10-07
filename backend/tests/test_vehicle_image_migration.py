from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text


IMAGE_COLUMNS = {
    "image_provider",
    "image_file_title",
    "image_url",
    "image_page_url",
    "image_creator",
    "image_license_name",
    "image_license_url",
    "image_match_kind",
}


def test_vehicle_image_migration_preserves_existing_rows_and_is_reversible(
    tmp_path: Path, monkeypatch
):
    backend_dir = Path(__file__).resolve().parents[1]
    database_file = tmp_path / "vehicle-image-migration.sqlite3"
    monkeypatch.setenv("DRIVE_WISE_DATABASE_URL", f"sqlite:///{database_file.as_posix()}")
    config = Config(str(backend_dir / "alembic.ini"))
    command.upgrade(config, "0005_admin_dashboard")

    engine = create_engine(f"sqlite:///{database_file.as_posix()}")
    try:
        with engine.begin() as connection:
            connection.execute(text("""
                INSERT INTO accounts (
                    id, name, email, email_normalized, password_hash, role,
                    status, brand, admin_slot, created_at, updated_at
                ) VALUES (
                    :id, 'Image Owner', 'image@example.com', 'image@example.com',
                    'unused', 'user', 'active', NULL, NULL, CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                )
            """), {"id": "a" * 32})
            connection.execute(text("""
                INSERT INTO vehicles (
                    id, owner_account_id, name, model, type, year, range_km,
                    mileage_km, fuel_type, created_at, updated_at
                ) VALUES (
                    :id, :owner, 'Audi', 'A5', 'combustion', 2020, 600,
                    12000, 'diesel', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
            """), {"id": "b" * 32, "owner": "a" * 32})

        command.upgrade(config, "0006_vehicle_image_preview")
        with engine.begin() as connection:
            connection.execute(text("""
                UPDATE vehicles SET
                    image_provider = 'wikimedia_commons',
                    image_file_title = 'File:Audi A5 2020.jpg',
                    image_url = 'https://upload.wikimedia.org/audi.jpg',
                    image_page_url = 'https://commons.wikimedia.org/wiki/File:Audi_A5_2020.jpg',
                    image_creator = 'Jane Driver',
                    image_license_name = 'CC BY-SA 4.0',
                    image_license_url = 'https://creativecommons.org/licenses/by-sa/4.0/'
                WHERE id = :id
            """), {"id": "b" * 32})

        command.upgrade(config, "head")
        inspector = inspect(engine)
        columns = {column["name"] for column in inspector.get_columns("vehicles")}
        assert IMAGE_COLUMNS <= columns
        with engine.connect() as connection:
            existing = connection.execute(
                text("SELECT name, model, year, image_provider, image_file_title, image_match_kind FROM vehicles WHERE id = :id"),
                {"id": "b" * 32},
            ).one()
            assert tuple(existing) == (
                "Audi", "A5", 2020, "wikimedia_commons", "File:Audi A5 2020.jpg", "exact"
            )
            assert connection.execute(
                text("SELECT image_provider, image_license_name, image_match_kind FROM vehicles WHERE id = :id"),
                {"id": "b" * 32},
            ).one() == ("wikimedia_commons", "CC BY-SA 4.0", "exact")

        command.downgrade(config, "0005_admin_dashboard")
        downgraded_columns = {
            column["name"] for column in inspect(engine).get_columns("vehicles")
        }
        assert IMAGE_COLUMNS.isdisjoint(downgraded_columns)
        with engine.connect() as connection:
            existing = connection.execute(
                text("SELECT name, model, year FROM vehicles WHERE id = :id"),
                {"id": "b" * 32},
            ).one()
            assert tuple(existing) == ("Audi", "A5", 2020)
    finally:
        engine.dispose()
