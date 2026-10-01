from argon2 import extract_parameters

from src.auth.passwords import hash_password, needs_rehash, verify_password


def test_argon2id_parameters_and_unique_salt() -> None:
    first = hash_password("ExamplePass1!")
    second = hash_password("ExamplePass1!")

    parameters = extract_parameters(first)
    assert parameters.type.name == "ID"
    assert parameters.memory_cost >= 19456
    assert parameters.time_cost == 2
    assert parameters.parallelism == 1
    assert first != second


def test_verifier_checks_password_and_rehash_parameters() -> None:
    verifier = hash_password("ExamplePass1!")

    assert verify_password(verifier, "ExamplePass1!")
    assert not verify_password(verifier, "WrongPass1!")
    assert not needs_rehash(verifier)


def test_verifier_material_is_not_the_password() -> None:
    password = "ExamplePass1!"
    verifier = hash_password(password)

    assert password not in verifier
    assert verifier.startswith("$argon2id$")
