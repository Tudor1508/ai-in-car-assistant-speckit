from src.auth.passwords import hash_password
from src.data.models.account import Account


ORIGIN = "https://testserver"


def logged_in(client, factory):
    with factory() as db:
        db.add(
            Account(
                id="d" * 32,
                name="Alex Driver",
                email="deactivate@example.com",
                email_normalized="deactivate@example.com",
                password_hash=hash_password("ExamplePass1!"),
                role="user",
                status="active",
            )
        )
        db.commit()
    csrf = client.post(
        "/auth/csrf/bootstrap", headers={"Origin": ORIGIN}
    ).json()["data"]["csrf_token"]
    response = client.post(
        "/auth/login",
        headers={"Origin": ORIGIN, "X-CSRF-Token": csrf},
        json={"email": "deactivate@example.com", "password": "ExamplePass1!"},
    )
    assert response.status_code == 200
    return response.json()["data"]["csrf_token"]


def test_deactivation_requires_confirmation_and_password(auth_client, session_factory):
    csrf = logged_in(auth_client, session_factory)
    headers = {"Origin": ORIGIN, "X-CSRF-Token": csrf}
    no_password = auth_client.request(
        "DELETE", "/auth/me", headers=headers, json={"confirmation": "DELETE"}
    )
    assert no_password.status_code == 403
    denied = auth_client.request(
        "DELETE",
        "/auth/me",
        headers=headers,
        json={"current_password": "WrongPass1!", "confirmation": "DELETE"},
    )
    assert denied.status_code == 403
    invalid = auth_client.request(
        "DELETE",
        "/auth/me",
        headers=headers,
        json={"current_password": "ExamplePass1!", "confirmation": "no"},
    )
    assert invalid.status_code == 422
    success = auth_client.request(
        "DELETE",
        "/auth/me",
        headers=headers,
        json={"current_password": "ExamplePass1!", "confirmation": "DELETE"},
    )
    assert success.status_code == 200
    assert success.json()["data"]["status"] == "disabled"
    assert auth_client.get("/auth/me").status_code == 401
    fresh_csrf = auth_client.post(
        "/auth/csrf/bootstrap", headers={"Origin": ORIGIN}
    ).json()["data"]["csrf_token"]
    relogin = auth_client.post(
        "/auth/login",
        headers={"Origin": ORIGIN, "X-CSRF-Token": fresh_csrf},
        json={"email": "deactivate@example.com", "password": "ExamplePass1!"},
    )
    assert relogin.status_code == 401
