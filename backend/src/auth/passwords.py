from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

_hasher = PasswordHasher(memory_cost=19456, time_cost=2, parallelism=1)


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(verifier: str, password: str) -> bool:
    try:
        return _hasher.verify(verifier, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def needs_rehash(verifier: str) -> bool:
    try:
        return _hasher.check_needs_rehash(verifier)
    except (VerificationError, InvalidHashError):
        return True
