from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.data.models.account import Account
from src.data.models.anonymous_csrf_context import AnonymousCsrfContext
from src.data.models.auth_session import AuthSession


def _config(database_file: Path) -> Config:
    config = Config("alembic.ini")
    config.set_main_option(
        "sqlalchemy.url", f"sqlite:///{database_file.as_posix()}"
    )
    return config


def test_migration_creates_auth_tables_and_can_downgrade(tmp_path: Path) -> None:
    database_file = tmp_path / "auth-migration.sqlite3"
    config = _config(database_file)

    command.upgrade(config, "head")
    engine = create_engine(f"sqlite:///{database_file.as_posix()}")
    try:
        assert set(inspect(engine).get_table_names()) == {
            "accounts",
            "alembic_version",
            "anonymous_csrf_contexts",
            "auth_sessions",
        }
    finally:
        engine.dispose()

    command.downgrade(config, "0001_foundation")
    engine = create_engine(f"sqlite:///{database_file.as_posix()}")
    try:
        assert inspect(engine).get_table_names() == ["alembic_version"]
    finally:
        engine.dispose()


def test_models_persist_account_sessions_and_anonymous_context(tmp_path: Path) -> None:
    engine = create_engine(f"sqlite:///{(tmp_path / 'auth.sqlite3').as_posix()}")
    from src.data.models.base import Base

    Base.metadata.create_all(engine)
    try:
        with Session(engine) as session:
            account = Account(
                id="account-1",
                name="Alex Morgan",
                email="Alex@example.com",
                email_normalized="alex@example.com",
                password_hash="$argon2id$test-verifier",
                role="user",
                status="active",
            )
            session.add(account)
            session.add(
                AuthSession(
                    id_digest="session-digest-1",
                    account_id=account.id,
                    csrf_token_digest="csrf-digest-1",
                )
            )
            session.add(
                AnonymousCsrfContext(
                    id_digest="anonymous-digest-1",
                    csrf_token_digest="anonymous-csrf-digest-1",
                )
            )
            session.commit()

        assert set(inspect(engine).get_table_names()) == {
            "accounts",
            "anonymous_csrf_contexts",
            "auth_sessions",
        }
    finally:
        engine.dispose()


def test_account_identity_is_unique_by_normalized_email(tmp_path: Path) -> None:
    engine = create_engine(f"sqlite:///{(tmp_path / 'unique.sqlite3').as_posix()}")
    from src.data.models.base import Base

    Base.metadata.create_all(engine)
    try:
        with Session(engine) as session:
            session.add_all(
                [
                    Account(
                        id="first",
                        name="First User",
                        email="Alex@example.com",
                        email_normalized="alex@example.com",
                        password_hash="verifier-1",
                        role="user",
                        status="active",
                    ),
                    Account(
                        id="second",
                        name="Second User",
                        email="alex@EXAMPLE.com",
                        email_normalized="alex@example.com",
                        password_hash="verifier-2",
                        role="user",
                        status="active",
                    ),
                ]
            )
            with pytest.raises(IntegrityError):
                session.commit()
    finally:
        engine.dispose()


def test_disabled_account_state_and_role_constraint_persist(tmp_path: Path) -> None:
    from src.data.database import create_engine as configured_engine
    from src.data.models.base import Base

    engine = configured_engine(f"sqlite:///{(tmp_path / 'state.sqlite3').as_posix()}")
    Base.metadata.create_all(engine)
    try:
        with Session(engine) as session:
            disabled = Account(
                id="disabled-1", name="Disabled", email="disabled@example.com",
                email_normalized="disabled@example.com", password_hash="verifier",
                role="user", status="disabled",
            )
            session.add(disabled)
            session.commit()
            assert session.get(Account, "disabled-1").status == "disabled"
            invalid = Account(
                id="invalid-1", name="Invalid", email="invalid@example.com",
                email_normalized="invalid@example.com", password_hash="verifier",
                role="superadmin", status="active",
            )
            session.add(invalid)
            with pytest.raises(IntegrityError):
                session.commit()
    finally:
        engine.dispose()
