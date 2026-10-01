import os

from alembic import context
from sqlalchemy.engine import Connection

from src.data.database import create_engine, get_database_url
from src.data.models import Base

config = context.config
database_url = os.environ.get("DRIVE_WISE_DATABASE_URL") or config.get_main_option(
    "sqlalchemy.url"
)
if database_url == "sqlite:///data/drive_wise.sqlite3":
    database_url = get_database_url()
config.set_main_option("sqlalchemy.url", database_url.replace("%", "%%"))

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    engine = create_engine(config.get_main_option("sqlalchemy.url"))
    try:
        with engine.connect() as connection:
            do_run_migrations(connection)
    finally:
        engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
