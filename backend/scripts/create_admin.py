"""Provision the single administrator from a trusted local terminal."""
import getpass
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from src.auth.passwords import hash_password
from src.auth.schemas import valid_email, valid_password
from src.data.database import create_engine, create_session_factory
from src.data.models.account import Account


def main() -> int:
    name = input("Administrator name: ").strip()
    if not name or len(name) > 120:
        print("Name must contain 1 to 120 characters.", file=sys.stderr)
        return 2
    try:
        email = valid_email(input("Administrator email: "))
        password = valid_password(getpass.getpass("Administrator password: "))
    except ValueError as error:
        print(str(error), file=sys.stderr)
        return 2
    engine = create_engine()
    try:
        with create_session_factory(engine).begin() as db:
            if db.scalar(select(Account.id).where(Account.admin_slot == "primary")):
                print("An administrator is already provisioned.", file=sys.stderr)
                return 1
            db.add(Account(id=uuid.uuid4().hex, name=name, email=email, email_normalized=email.casefold(), password_hash=hash_password(password), role="admin", status="active", admin_slot="primary"))
        print("Administrator account created.")
        return 0
    finally:
        engine.dispose()


if __name__ == "__main__":
    raise SystemExit(main())
