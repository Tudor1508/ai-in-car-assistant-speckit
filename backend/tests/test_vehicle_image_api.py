from src.vehicles import routes, service
from src.vehicles.image_provider import CommonsVehicleImage


ORIGIN = "https://testserver"


def signed_in(client, email="image-preview@example.com"):
    token = client.post("/auth/csrf/bootstrap", headers={"Origin": ORIGIN}).json()["data"]["csrf_token"]
    client.post("/auth/register", headers={"Origin": ORIGIN, "X-CSRF-Token": token}, json={
        "name": "Image Preview Owner", "email": email, "password": "ExamplePass1!", "password_confirmation": "ExamplePass1!",
    })
    login = client.post("/auth/login", headers={"Origin": ORIGIN, "X-CSRF-Token": token}, json={"email": email, "password": "ExamplePass1!"})
    return login.json()["data"]["csrf_token"]


def test_vehicle_image_preview_requires_authentication(auth_client):
    response = auth_client.get("/vehicles/image-preview", params={"name": "Audi", "model": "A5", "year": 2020})
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "authentication_required"


def test_vehicle_image_preview_returns_match_and_safe_fallback(auth_client, monkeypatch):
    signed_in(auth_client)
    matched = matching_image()
    monkeypatch.setattr(routes.image_provider, "search_vehicle_image", lambda *_args: matched)
    response = auth_client.get("/vehicles/image-preview", params={"name": "Audi", "model": "A5", "year": 2020})
    assert response.status_code == 200
    assert response.json()["data"] == {"status": "matched", "image": matched.as_response()}

    monkeypatch.setattr(routes.image_provider, "search_vehicle_image", lambda *_args: None)
    fallback = auth_client.get("/vehicles/image-preview", params={"name": "Unknown", "model": "Vehicle", "year": 2020})
    assert fallback.status_code == 200
    assert fallback.json()["data"] == {"status": "fallback", "image": None}


def test_vehicle_image_preview_validates_query_and_never_treats_static_path_as_vehicle_id(auth_client):
    signed_in(auth_client)
    invalid_year = auth_client.get("/vehicles/image-preview", params={"name": "Audi", "model": "A5", "year": 2100})
    assert invalid_year.status_code == 422
    assert invalid_year.json()["error"]["code"] == "validation_error"


def vehicle_payload(**changes):
    payload = {
        "name": "Audi",
        "model": "A5",
        "type": "combustion",
        "year": 2020,
        "range_km": 600,
        "mileage_km": 12000,
        "fuel_type": "diesel",
    }
    payload.update(changes)
    return payload


def matching_image(title="File:Audi A5 2020.jpg"):
    return CommonsVehicleImage(
        file_title=title,
        image_url="https://upload.wikimedia.org/audi.jpg",
        file_page_url="https://commons.wikimedia.org/wiki/File:Audi_A5_2020.jpg",
        creator="Jane Driver",
        license_name="CC BY-SA 4.0",
        license_url="https://creativecommons.org/licenses/by-sa/4.0/",
        match_kind="exact",
    )


def test_vehicle_create_and_read_persist_image_attribution(auth_client, monkeypatch):
    csrf = signed_in(auth_client, "persist-image@example.com")
    monkeypatch.setattr(service, "resolve_vehicle_image", lambda *_args: matching_image())
    created = auth_client.post(
        "/vehicles",
        headers={"Origin": ORIGIN, "X-CSRF-Token": csrf},
        json=vehicle_payload(image_file_title="File:Audi A5 2020.jpg"),
    )
    assert created.status_code == 201
    vehicle = created.json()["data"]["vehicle"]
    assert vehicle["image"]["file_title"] == "File:Audi A5 2020.jpg"
    assert vehicle["image"]["creator"] == "Jane Driver"
    assert vehicle["image"]["license_name"] == "CC BY-SA 4.0"

    listed = auth_client.get("/vehicles").json()["data"]["vehicles"]
    assert listed[0]["image"] == vehicle["image"]


def test_patch_preserves_unrelated_image_and_clears_identity_when_lookup_fails(auth_client, monkeypatch):
    csrf = signed_in(auth_client, "edit-image@example.com")
    monkeypatch.setattr(service, "resolve_vehicle_image", lambda *_args: matching_image())
    created = auth_client.post(
        "/vehicles",
        headers={"Origin": ORIGIN, "X-CSRF-Token": csrf},
        json=vehicle_payload(image_file_title="File:Audi A5 2020.jpg"),
    )
    vehicle = created.json()["data"]["vehicle"]
    vehicle_url = f"/vehicles/{vehicle['id']}"

    monkeypatch.setattr(service, "resolve_vehicle_image", lambda *_args: None)
    unrelated = auth_client.patch(
        vehicle_url,
        headers={"Origin": ORIGIN, "X-CSRF-Token": csrf},
        json={"mileage_km": 14000},
    )
    assert unrelated.status_code == 200
    assert unrelated.json()["data"]["vehicle"]["image"]["file_title"] == "File:Audi A5 2020.jpg"

    changed = auth_client.patch(
        vehicle_url,
        headers={"Origin": ORIGIN, "X-CSRF-Token": csrf},
        json={"model": "A6"},
    )
    assert changed.status_code == 200
    assert changed.json()["data"]["vehicle"]["image"] is None


def test_create_provider_failure_and_arbitrary_image_url_do_not_block_vehicle_save(auth_client, monkeypatch):
    csrf = signed_in(auth_client, "fallback-image@example.com")
    monkeypatch.setattr(service, "resolve_vehicle_image", lambda *_args: None)
    saved = auth_client.post(
        "/vehicles",
        headers={"Origin": ORIGIN, "X-CSRF-Token": csrf},
        json=vehicle_payload(image_file_title="File:Audi A5 2020.jpg"),
    )
    assert saved.status_code == 201
    assert saved.json()["data"]["vehicle"]["image"] is None

    invalid = auth_client.post(
        "/vehicles",
        headers={"Origin": ORIGIN, "X-CSRF-Token": csrf},
        json=vehicle_payload(image_file_title="https://attacker.example/car.jpg"),
    )
    assert invalid.status_code == 422


def test_uploaded_photo_is_private_persistent_and_kept_until_explicit_discard(auth_client, monkeypatch):
    csrf = signed_in(auth_client, "upload-image@example.com")
    monkeypatch.setattr(service, "resolve_vehicle_image", lambda *_args: None)
    created = auth_client.post(
        "/vehicles", headers={"Origin": ORIGIN, "X-CSRF-Token": csrf}, json=vehicle_payload()
    )
    vehicle_id = created.json()["data"]["vehicle"]["id"]
    png = __import__("base64").b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l5sAAAAASUVORK5CYII="
    )
    uploaded = auth_client.post(
        f"/vehicles/{vehicle_id}/image",
        headers={"Origin": ORIGIN, "X-CSRF-Token": csrf, "Content-Type": "image/png"},
        content=png,
    )
    assert uploaded.status_code == 200
    image = uploaded.json()["data"]["vehicle"]["image"]
    assert image == {
        "provider": "user_upload",
        "image_url": f"/vehicles/{vehicle_id}/image-content",
        "match_kind": "uploaded",
    }

    content = auth_client.get(image["image_url"])
    assert content.status_code == 200
    assert content.content == png
    assert content.headers["content-type"] == "image/png"
    assert content.headers["cache-control"] == "private, no-store"
    assert content.headers["x-content-type-options"] == "nosniff"

    monkeypatch.setattr(service, "resolve_vehicle_image", lambda *_args: (_ for _ in ()).throw(AssertionError("Commons must not replace an uploaded image")))
    changed = auth_client.patch(
        f"/vehicles/{vehicle_id}",
        headers={"Origin": ORIGIN, "X-CSRF-Token": csrf},
        json={"model": "A6", "image_file_title": None},
    )
    assert changed.status_code == 200
    assert changed.json()["data"]["vehicle"]["image"]["provider"] == "user_upload"

    replacement = matching_image("File:Audi A6 2020.jpg")
    monkeypatch.setattr(service, "resolve_vehicle_image", lambda *_args: replacement)
    discarded = auth_client.patch(
        f"/vehicles/{vehicle_id}",
        headers={"Origin": ORIGIN, "X-CSRF-Token": csrf},
        json={"discard_uploaded_image": True, "image_file_title": replacement.file_title},
    )
    assert discarded.status_code == 200
    assert discarded.json()["data"]["vehicle"]["image"]["provider"] == "wikimedia_commons"


def test_uploaded_photo_rejects_mime_mismatch_and_oversize(auth_client):
    csrf = signed_in(auth_client, "invalid-upload-image@example.com")
    created = auth_client.post(
        "/vehicles", headers={"Origin": ORIGIN, "X-CSRF-Token": csrf}, json=vehicle_payload()
    )
    vehicle_id = created.json()["data"]["vehicle"]["id"]
    headers = {"Origin": ORIGIN, "X-CSRF-Token": csrf, "Content-Type": "image/png"}
    invalid = auth_client.post(f"/vehicles/{vehicle_id}/image", headers=headers, content=b"not an image")
    assert invalid.status_code == 415
    oversized = auth_client.post(
        f"/vehicles/{vehicle_id}/image", headers=headers, content=b"\x89PNG\r\n\x1a\n" + b"x" * (5 * 1024 * 1024)
    )
    assert oversized.status_code == 413
