import pytest

from src.auth.passwords import hash_password
from src.data.models.account import Account
from src.data.models.vehicle import Vehicle
from src.vehicles import service
from src.vehicles.image_provider import CommonsVehicleImage

ORIGIN = "https://testserver"


def signed_in(client, email):
    token = client.post("/auth/csrf/bootstrap", headers={"Origin": ORIGIN}).json()["data"]["csrf_token"]
    client.post("/auth/register", headers={"Origin": ORIGIN, "X-CSRF-Token": token}, json={
        "name": "Mutation Owner", "email": email, "password": "ExamplePass1!", "password_confirmation": "ExamplePass1!",
    })
    login = client.post("/auth/login", headers={"Origin": ORIGIN, "X-CSRF-Token": token}, json={"email": email, "password": "ExamplePass1!"})
    return login.json()["data"]["csrf_token"]


def headers(csrf):
    return {"Origin": ORIGIN, "X-CSRF-Token": csrf}


def payload(**changes):
    vehicle = {
        "name": " Daily driver ", "model": " Audi A5 ", "brand": " Audi ", "type": "combustion",
        "year": 2020, "range_km": 600, "mileage_km": 320000, "fuel_type": "diesel",
    }
    vehicle.update(changes)
    return vehicle


def test_create_and_patch_trim_fields_and_persist_values(auth_client):
    csrf = signed_in(auth_client, "mutation@example.com")
    created = auth_client.post("/vehicles", headers=headers(csrf), json=payload())
    assert created.status_code == 201
    vehicle = created.json()["data"]["vehicle"]
    assert vehicle["name"] == "Daily driver"
    assert vehicle["model"] == "Audi A5"
    assert "owner_account_id" not in vehicle
    updated = auth_client.patch(f"/vehicles/{vehicle['id']}", headers=headers(csrf), json={"mileage_km": 325000})
    assert updated.status_code == 200
    assert updated.json()["data"]["vehicle"]["mileage_km"] == 325000
    assert auth_client.get(f"/vehicles/{vehicle['id']}").json()["data"]["vehicle"]["mileage_km"] == 325000


def test_create_generates_name_from_brand_and_model_when_omitted(auth_client):
    csrf = signed_in(auth_client, "generated-name@example.com")
    vehicle_payload = payload(brand="Mercedes", model="S Class")
    vehicle_payload.pop("name")

    created = auth_client.post("/vehicles", headers=headers(csrf), json=vehicle_payload)

    assert created.status_code == 201
    vehicle = created.json()["data"]["vehicle"]
    assert vehicle["name"] == "Mercedes S Class"

    updated = auth_client.patch(
        f"/vehicles/{vehicle['id']}",
        headers=headers(csrf),
        json={"brand": "Mercedes", "model": "E Class"},
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["vehicle"]["name"] == "Mercedes E Class"


def test_image_resolution_failure_keeps_valid_saves_and_vehicle_image_lifecycle(auth_client, monkeypatch):
    csrf = signed_in(auth_client, "image-lifecycle@example.com")
    image = CommonsVehicleImage(
        file_title="File:Audi A5 2020.jpg",
        image_url="https://upload.wikimedia.org/audi.jpg",
        file_page_url="https://commons.wikimedia.org/wiki/File:Audi_A5_2020.jpg",
        creator="Jane Driver",
        license_name="CC BY-SA 4.0",
        license_url="https://creativecommons.org/licenses/by-sa/4.0/",
        match_kind="exact",
    )
    monkeypatch.setattr(service, "resolve_vehicle_image", lambda *_args: image)
    created = auth_client.post(
        "/vehicles",
        headers=headers(csrf),
        json=payload(name="Audi", model="A5", image_file_title=image.file_title),
    )
    assert created.status_code == 201
    vehicle = created.json()["data"]["vehicle"]
    vehicle_url = f"/vehicles/{vehicle['id']}"
    assert vehicle["image"]["file_title"] == image.file_title

    monkeypatch.setattr(service, "resolve_vehicle_image", lambda *_args: None)
    unchanged = auth_client.patch(vehicle_url, headers=headers(csrf), json={"mileage_km": 12500})
    assert unchanged.status_code == 200
    assert unchanged.json()["data"]["vehicle"]["image"]["file_title"] == image.file_title

    changed = auth_client.patch(vehicle_url, headers=headers(csrf), json={"year": 2021})
    assert changed.status_code == 200
    assert changed.json()["data"]["vehicle"]["image"] is None

    fallback_create = auth_client.post(
        "/vehicles",
        headers=headers(csrf),
        json=payload(name="Unknown", model="Vehicle", image_file_title=image.file_title),
    )
    assert fallback_create.status_code == 201
    assert fallback_create.json()["data"]["vehicle"]["image"] is None


def test_electric_vehicle_has_no_fuel_and_type_changes_validate_merged_record(auth_client):
    csrf = signed_in(auth_client, "electric@example.com")
    created = auth_client.post("/vehicles", headers=headers(csrf), json=payload(type="electric", fuel_type=None))
    assert created.status_code == 201
    vehicle_id = created.json()["data"]["vehicle"]["id"]
    assert created.json()["data"]["vehicle"]["fuel_type"] is None
    invalid_switch = auth_client.patch(f"/vehicles/{vehicle_id}", headers=headers(csrf), json={"type": "combustion"})
    assert invalid_switch.status_code == 422
    unchanged = auth_client.get(f"/vehicles/{vehicle_id}").json()["data"]["vehicle"]
    assert unchanged["type"] == "electric" and unchanged["fuel_type"] is None
    valid_switch = auth_client.patch(f"/vehicles/{vehicle_id}", headers=headers(csrf), json={"type": "combustion", "fuel_type": "petrol"})
    assert valid_switch.status_code == 200
    back_to_electric = auth_client.patch(f"/vehicles/{vehicle_id}", headers=headers(csrf), json={"type": "electric", "fuel_type": None})
    assert back_to_electric.status_code == 200


def test_invalid_fields_and_unknown_or_empty_patch_are_rejected(auth_client):
    csrf = signed_in(auth_client, "invalid@example.com")
    for invalid in (
        payload(name="   "), payload(name="x" * 81), payload(year=2100),
        payload(range_km=-1), payload(mileage_km=1.5), payload(type="other"),
        payload(fuel_type="hydrogen"), {**payload(), "owner_account_id": "x" * 32},
    ):
        response = auth_client.post("/vehicles", headers=headers(csrf), json=invalid)
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "validation_error"
    created = auth_client.post("/vehicles", headers=headers(csrf), json=payload())
    vehicle_id = created.json()["data"]["vehicle"]["id"]
    assert auth_client.patch(f"/vehicles/{vehicle_id}", headers=headers(csrf), json={}).status_code == 422
    assert auth_client.patch(f"/vehicles/{vehicle_id}", headers=headers(csrf), json={"year": None}).status_code == 422


def test_mutations_require_authenticated_session_and_csrf(auth_client):
    assert auth_client.post("/vehicles", json=payload()).status_code == 401
    csrf = signed_in(auth_client, "csrf@example.com")
    assert auth_client.post("/vehicles", headers={"Origin": ORIGIN}, json=payload()).status_code == 403


def test_another_account_cannot_update_a_vehicle(auth_client, session_factory):
    csrf = signed_in(auth_client, "first-owner@example.com")
    with session_factory() as db:
        first = db.query(Account).filter_by(email="first-owner@example.com").one()
        other = Account(id="d" * 32, name="Other", email="second-owner@example.com", email_normalized="second-owner@example.com", password_hash="unused", role="user", status="active")
        db.add(other)
        db.add(Vehicle(id="a" * 32, owner_account_id=other.id, name="Other's car", model="Model", type="electric", year=2022, range_km=100, mileage_km=20, fuel_type=None))
        db.commit()
        assert first.id != other.id
    response = auth_client.patch(f"/vehicles/{'a' * 32}", headers=headers(csrf), json={"name": "stolen"})
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "vehicle_not_found"


def test_another_account_cannot_change_a_foreign_vehicle_image(auth_client, session_factory, monkeypatch):
    csrf = signed_in(auth_client, "image-owner@example.com")
    foreign_id = "9" * 32
    with session_factory() as db:
        owner = db.query(Account).filter_by(email="image-owner@example.com").one()
        other = Account(
            id="4" * 32,
            name="Foreign image owner",
            email="foreign-image-owner@example.com",
            email_normalized="foreign-image-owner@example.com",
            password_hash="unused",
            role="user",
            status="active",
        )
        db.add(other)
        db.add(Vehicle(
            id=foreign_id,
            owner_account_id=other.id,
            name="Audi",
            model="A5",
            type="combustion",
            year=2020,
            range_km=600,
            mileage_km=12000,
            fuel_type="diesel",
        ))
        db.commit()
        assert owner.id != other.id

    def provider_must_not_be_called(*_args):
        pytest.fail("foreign vehicle image mutation reached the Commons provider")

    monkeypatch.setattr("src.vehicles.service.resolve_vehicle_image", provider_must_not_be_called)
    response = auth_client.patch(
        f"/vehicles/{foreign_id}",
        headers=headers(csrf),
        json={"image_file_title": "File:Audi A5 2020.jpg"},
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "vehicle_not_found"

    with session_factory() as db:
        foreign = db.get(Vehicle, foreign_id)
        assert foreign is not None
        assert foreign.image_file_title is None
        assert foreign.model == "A5"


@pytest.mark.parametrize("role", ["user", "admin", "producer"])
def test_every_account_role_can_mutate_own_vehicles_only(auth_client, session_factory, role):
    owner_id = ("5" if role == "user" else "6" if role == "admin" else "7") * 32
    other_id = "8" * 32
    with session_factory() as db:
        db.add_all([
            Account(id=owner_id, name="Role owner", email=f"{role}@mutations.example", email_normalized=f"{role}@mutations.example", password_hash=hash_password("ExamplePass1!"), role=role, status="active", admin_slot="primary" if role == "admin" else None),
            Account(id=other_id, name="Other", email="other@mutations.example", email_normalized="other@mutations.example", password_hash="unused", role="user", status="active"),
            Vehicle(id="b" * 32, owner_account_id=other_id, name="Other car", model="Other model", type="electric", year=2023, range_km=350, mileage_km=120, fuel_type=None),
        ])
        db.commit()

    csrf = auth_client.post("/auth/csrf/bootstrap", headers={"Origin": ORIGIN}).json()["data"]["csrf_token"]
    login_response = auth_client.post("/auth/login", headers={"Origin": ORIGIN, "X-CSRF-Token": csrf}, json={"email": f"{role}@mutations.example", "password": "ExamplePass1!"})
    assert login_response.status_code == 200
    csrf = login_response.json()["data"]["csrf_token"]

    created = auth_client.post("/vehicles", headers=headers(csrf), json=payload())
    assert created.status_code == 201
    own_id = created.json()["data"]["vehicle"]["id"]
    assert auth_client.patch(f"/vehicles/{own_id}", headers=headers(csrf), json={"name": "Updated own car"}).status_code == 200
    assert auth_client.patch(f"/vehicles/{'b' * 32}", headers=headers(csrf), json={"name": "stolen"}).status_code == 404
    assert auth_client.delete(f"/vehicles/{'b' * 32}", headers=headers(csrf)).status_code == 404
    assert auth_client.delete(f"/vehicles/{own_id}", headers=headers(csrf)).status_code == 200

    with session_factory() as db:
        foreign_vehicle = db.get(Vehicle, "b" * 32)
        assert foreign_vehicle is not None
        assert foreign_vehicle.name == "Other car"
