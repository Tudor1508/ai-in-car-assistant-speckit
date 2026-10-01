from concurrent.futures import ThreadPoolExecutor

from fastapi.testclient import TestClient


def bootstrap(client: TestClient) -> str:
    response = client.post(
        "/auth/csrf/bootstrap", headers={"Origin": "https://testserver"}
    )
    assert response.status_code == 200
    assert response.json()["data"]["csrf_token"]
    return response.json()["data"]["csrf_token"]


def register(client: TestClient, token: str, **overrides: object):
    body: dict[str, object] = {
        "name": "Alex Morgan",
        "email": "Alex@example.com",
        "password": "ExamplePass1!",
        "password_confirmation": "ExamplePass1!",
    }
    body.update(overrides)
    return client.post(
        "/auth/register",
        json=body,
        headers={
            "Origin": "https://testserver",
            "X-CSRF-Token": token,
        },
    )


def test_registration_creates_only_ordinary_unverified_account(auth_client: TestClient) -> None:
    token = bootstrap(auth_client)
    response = register(auth_client, token)

    assert response.status_code == 201
    profile = response.json()["data"]
    assert profile["name"] == "Alex Morgan"
    assert profile["email"] == "Alex@example.com"
    assert profile["email_verified"] is False
    assert profile["role"] == "user"
    assert "password" not in response.text
    assert "password_hash" not in response.text
    assert "set-cookie" not in response.headers


def test_registration_rejects_invalid_input_without_partial_account(
    auth_client: TestClient,
) -> None:
    token = bootstrap(auth_client)
    response = register(auth_client, token, password_confirmation="DifferentPass2!")

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
    assert "DifferentPass2!" not in response.text
    login = auth_client.post(
        "/auth/login",
        headers={"Origin": "https://testserver", "X-CSRF-Token": token},
        json={"email": "Alex@example.com", "password": "ExamplePass1!"},
    )
    assert login.status_code == 401


def test_password_validation_errors_never_echo_submitted_secrets(
    auth_client: TestClient,
) -> None:
    token = bootstrap(auth_client)
    secret = "WeakSecret123"
    response = register(
        auth_client,
        token,
        email="invalid-password@example.com",
        password=secret,
        password_confirmation="DifferentSecret456!",
    )

    assert response.status_code == 422
    assert secret not in response.text
    assert "DifferentSecret456!" not in response.text


def test_valid_csrf_activity_persists_when_registration_returns_conflict(
    auth_client: TestClient,
    session_factory,
    monkeypatch,
) -> None:
    from datetime import datetime, timedelta, timezone
    from src.auth import csrf
    from src.auth.tokens import token_digest
    from src.data.models.anonymous_csrf_context import AnonymousCsrfContext

    start = datetime(2026, 1, 1, tzinfo=timezone.utc)
    monkeypatch.setattr(csrf, "utc_now", lambda: start)
    token = bootstrap(auth_client)
    assert register(auth_client, token).status_code == 201
    context_id = auth_client.cookies.get("__Host-dw_session")

    later = start + timedelta(minutes=4)
    monkeypatch.setattr(csrf, "utc_now", lambda: later)
    conflict = register(auth_client, token)
    assert conflict.status_code == 409
    with session_factory() as db:
        context = db.get(AnonymousCsrfContext, token_digest(context_id))
        assert context is not None
        assert context.last_seen_at == later.replace(tzinfo=None)


def test_registration_rejects_privileged_role_injection(auth_client: TestClient) -> None:
    token = bootstrap(auth_client)
    response = register(auth_client, token, role="admin")

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_duplicate_email_is_case_insensitive_and_non_enumerating(
    auth_client: TestClient,
) -> None:
    token = bootstrap(auth_client)
    assert register(auth_client, token).status_code == 201
    second = register(auth_client, token, email="  alex@EXAMPLE.com  ")

    assert second.status_code == 409
    assert second.json()["error"]["code"] == "email_unavailable"
    assert "Alex@example.com" not in second.text


def test_concurrent_duplicate_registration_creates_one_account(
    auth_client: TestClient,
) -> None:
    token = bootstrap(auth_client)

    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(
            pool.map(lambda _: register(auth_client, token), range(2))
        )

    assert sorted(response.status_code for response in responses) == [201, 409]
