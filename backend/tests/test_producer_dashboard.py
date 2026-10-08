from decimal import Decimal
import json
import secrets

from fastapi.testclient import TestClient
from src.auth.passwords import hash_password

from src.data.models.account import Account, utc_now
from src.data.models.trip_history import TripHistory
from src.data.models.vehicle import Vehicle


ORIGIN = "https://testserver"


def add_account(client, session_factory, email: str, role: str = "user", brand: str | None = None):
    bootstrap = client.post("/auth/csrf/bootstrap", headers={"Origin": ORIGIN})
    token = bootstrap.json()["data"]["csrf_token"]
    registered = client.post("/auth/register", headers={"Origin": ORIGIN, "X-CSRF-Token": token}, json={
        "name": f"Private {email}", "email": email, "password": "ExamplePass1!", "password_confirmation": "ExamplePass1!",
    })
    assert registered.status_code == 201, registered.text
    with session_factory() as db:
        account = db.query(Account).filter_by(email=email).one()
        account.role = role
        account.brand = brand
        account.admin_slot = "primary" if role == "admin" else None
        db.commit()
    login = client.post("/auth/login", headers={"Origin": ORIGIN, "X-CSRF-Token": token}, json={"email": email, "password": "ExamplePass1!"})
    assert login.status_code == 200, login.text
    return login.json()["data"]["csrf_token"]


def add_vehicle(db, owner_id: str, vehicle_id: str, brand: str | None, name: str, vehicle_type="electric", archived_at=None):
    vehicle = Vehicle(
        id=vehicle_id, owner_account_id=owner_id, name=name, model="Model 3", brand=brand,
        type=vehicle_type, year=2024, range_km=400, mileage_km=80000,
        fuel_type=None if vehicle_type == "electric" else "petrol", archived_at=archived_at,
    )
    db.add(vehicle)
    return vehicle


def seed_account(db, email: str, role: str = "user", brand: str | None = None, status: str = "active") -> Account:
    account = Account(
        id=secrets.token_hex(16), name=f"Private {email}", email=email,
        email_normalized=email.casefold(), password_hash=hash_password("ExamplePass1!"),
        role=role, status=status, brand=brand,
        admin_slot="primary" if role == "admin" else None,
    )
    db.add(account)
    db.flush()
    return account


def login_client(client: TestClient, email: str) -> None:
    token = client.post("/auth/csrf/bootstrap", headers={"Origin": ORIGIN}).json()["data"]["csrf_token"]
    response = client.post("/auth/login", headers={"Origin": ORIGIN, "X-CSRF-Token": token}, json={"email": email, "password": "ExamplePass1!"})
    assert response.status_code == 200, response.text


def add_trip(db, owner_id: str, vehicle: Vehicle, trip_id: str, origin: str, destination: str, distance_m: int, *, brand="Tesla", created_at=None):
    db.add(TripHistory(
        id=trip_id,
        owner_account_id=owner_id,
        created_at=created_at or utc_now(),
        origin_label=origin,
        origin_latitude=Decimal("44.4268"),
        origin_longitude=Decimal("26.1025"),
        destination_label=destination,
        destination_latitude=Decimal("45.6579"),
        destination_longitude=Decimal("25.6012"),
        vehicle_id=vehicle.id,
        vehicle_snapshot={"id": vehicle.id, "name": vehicle.name, "model": vehicle.model, "brand": brand, "type": vehicle.type},
        route_preference="fastest",
        distance_m=Decimal(distance_m),
        duration_s=Decimal(3600),
        route_snapshot={"route": {"geometry": {"type": "LineString", "coordinates": []}}},
    ))


def test_producer_report_scopes_brand_and_aggregates_saved_route_distance(auth_client, session_factory):
    add_account(auth_client, session_factory, "producer@tesla.example", "producer", " Tesla ")
    with session_factory() as db:
        driver_one = seed_account(db, "driver-one@example.com")
        driver_two = seed_account(db, "driver-two@example.com")
        bmw_owner = seed_account(db, "private-bmw@example.com")
        active = add_vehicle(db, driver_one.id, "a" * 32, "  tEsLa  ", "Tesla daily")
        second = add_vehicle(db, driver_two.id, "b" * 32, "TESLA", "Tesla archived", archived_at=utc_now())
        add_vehicle(db, bmw_owner.id, "c" * 32, "BMW", "BMW car")
        add_vehicle(db, driver_one.id, "d" * 32, None, "Unbranded legacy")
        add_trip(db, driver_one.id, active, "1" * 32, "Bucharest", "Brasov", 12500, brand="Tesla")
        add_trip(db, driver_two.id, second, "2" * 32, " bucharest ", "BRASOV", 17500, brand="Tesla")
        add_trip(db, bmw_owner.id, db.query(Vehicle).filter_by(id="c" * 32).one(), "3" * 32, "Bucharest", "Brasov", 99000, brand="BMW")
        db.commit()

    with TestClient(auth_client.app, base_url=ORIGIN) as producer_client:
        login_client(producer_client, "producer@tesla.example")
        response = producer_client.get("/producer/report")
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["companyName"] == "Tesla"
    assert data["usersCount"] == 1
    assert data["activeUsersCount"] == 1
    assert data["vehiclesCount"] == 1
    assert data["historicalVehiclesCount"] == 2
    assert data["usedVehiclesCount"] == 1
    assert data["historicalUsedVehiclesCount"] == 2
    assert data["tripsCount"] == 2
    assert data["totalDistanceKm"] == 30
    assert [(row["vehicleType"], row["vehiclesCount"], row["historicalVehiclesCount"], row["tripsCount"]) for row in data["vehicleTypes"]] == [
        ("electric", 1, 2, 2), ("combustion", 0, 0, 0),
    ]
    assert len(data["routes"]) == 1
    route = data["routes"][0]
    assert route["tripsCount"] == 2
    assert route["uniqueUsersCount"] == 2
    assert route["vehicleCount"] == 2
    assert route["totalDistanceKm"] == 30
    assert data["vehicleTopRoutes"][0]["origin"].strip().casefold() == "bucharest"
    assert data["vehicleTopRoutes"][0]["destination"].strip().casefold() == "brasov"
    assert data["vehicleTopRoutes"][0]["tripsCount"] == 1
    assert {"name", "email", "owner_account_id", "vehicle_id"}.isdisjoint(route)
    body = json.dumps(data)
    assert "driver-one@example.com" not in body
    assert "driver-two@example.com" not in body


def test_producer_report_auth_matrix_and_missing_brand(auth_client, session_factory):
    assert auth_client.get("/producer/report").status_code == 401
    with session_factory() as db:
        seed_account(db, "ordinary@example.com", "user")
        seed_account(db, "administrator@example.com", "admin")
        seed_account(db, "unconfigured@example.com", "producer", None)
        db.commit()
    for email, expected_status in (("ordinary@example.com", 403), ("administrator@example.com", 403), ("unconfigured@example.com", 409)):
        with TestClient(auth_client.app, base_url=ORIGIN) as client:
            login_client(client, email)
            response = client.get("/producer/report")
            assert response.status_code == expected_status
            if expected_status == 409:
                assert response.json()["error"]["code"] == "producer_brand_not_configured"


def test_producer_report_empty_values(auth_client, session_factory):
    with session_factory() as db:
        seed_account(db, "empty@brand.example", "producer", "No Cars")
        db.commit()
    with TestClient(auth_client.app, base_url=ORIGIN) as client:
        login_client(client, "empty@brand.example")
        response = client.get("/producer/report")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["vehiclesCount"] == data["historicalVehiclesCount"] == 0
    assert data["tripsCount"] == data["totalDistanceKm"] == 0
    assert data["routes"] == data["recentTrips"] == data["fleetTimeline"] == []
    assert data["vehicleTypes"] == [
        {"vehicleType": "electric", "vehiclesCount": 0, "historicalVehiclesCount": 0, "usedVehiclesCount": 0, "tripsCount": 0},
        {"vehicleType": "combustion", "vehiclesCount": 0, "historicalVehiclesCount": 0, "usedVehiclesCount": 0, "tripsCount": 0},
    ]
