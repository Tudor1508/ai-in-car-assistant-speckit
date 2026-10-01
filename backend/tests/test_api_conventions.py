from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from pydantic import BaseModel

from src.api.errors import install_error_handlers
from src.api.responses import SuccessEnvelope, common_error_responses, success_envelope
from src.main import app as production_app


class ExampleRequest(BaseModel):
    count: int


class ExampleResponse(BaseModel):
    count: int


def create_contract_app() -> FastAPI:
    app = FastAPI(title="API contract test fixture")
    install_error_handlers(app)

    @app.post(
        "/contract-example",
        response_model=SuccessEnvelope[ExampleResponse],
        responses=common_error_responses(),
    )
    def contract_example(payload: ExampleRequest) -> dict[str, object]:
        if payload.count == 13:
            raise RuntimeError("secret-token INTERNAL-DATABASE-PATH")
        return success_envelope({"count": payload.count})

    @app.get("/explicit-http-error", responses=common_error_responses())
    def explicit_http_error() -> None:
        raise HTTPException(status_code=404, detail="secret internal detail")

    return app


def test_http_success_uses_data_envelope() -> None:
    response = TestClient(create_contract_app()).post(
        "/contract-example", json={"count": 4}
    )

    assert response.status_code == 200
    assert response.json() == {"data": {"count": 4}}


def test_invalid_request_uses_safe_422_error_envelope() -> None:
    response = TestClient(create_contract_app()).post(
        "/contract-example", json={"count": "not-an-integer"}
    )

    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "validation_error"
    assert body["error"]["message"] == "Request validation failed"
    assert body["error"]["details"]
    assert "not-an-integer" not in response.text
    assert "input" not in body["error"]["details"][0]


def test_unexpected_failure_is_generic_500_without_internal_details() -> None:
    response = TestClient(create_contract_app(), raise_server_exceptions=False).post(
        "/contract-example", json={"count": 13}
    )

    assert response.status_code == 500
    assert response.json() == {
        "error": {
            "code": "internal_error",
            "message": "An unexpected error occurred",
        }
    }
    assert "secret-token" not in response.text
    assert "INTERNAL-DATABASE-PATH" not in response.text
    assert "RuntimeError" not in response.text


def test_openapi_documents_request_success_and_common_errors() -> None:
    schema = create_contract_app().openapi()

    assert schema["openapi"] == "3.1.0"
    operation = schema["paths"]["/contract-example"]["post"]
    assert operation["requestBody"]["content"]["application/json"]["schema"]["$ref"].endswith(
        "/ExampleRequest"
    )
    success_schema = operation["responses"]["200"]["content"]["application/json"]["schema"]
    success_schema = schema["components"]["schemas"][success_schema["$ref"].split("/")[-1]]
    assert "data" in success_schema["properties"]
    assert {"404", "405", "422", "500"}.issubset(operation["responses"])
    for status in ("404", "405", "422", "500"):
        error_schema = operation["responses"][status]["content"]["application/json"]["schema"]
        error_schema = schema["components"]["schemas"][error_schema["$ref"].split("/")[-1]]
        assert "error" in error_schema["properties"]
        error_body_ref = error_schema["properties"]["error"]["$ref"].split("/")[-1]
        error_body_schema = schema["components"]["schemas"][error_body_ref]
        assert {"code", "message", "details", "request_id"}.issubset(
            error_body_schema["properties"]
        )


def test_router_not_found_uses_safe_error_envelope() -> None:
    response = TestClient(create_contract_app()).get("/not-a-route")

    assert response.status_code == 404
    assert response.json() == {
        "error": {
            "code": "http_error",
            "message": "The request could not be completed",
        }
    }


def test_method_not_allowed_uses_envelope_and_preserves_allow_header() -> None:
    response = TestClient(create_contract_app()).get("/contract-example")

    assert response.status_code == 405
    assert response.json() == {
        "error": {
            "code": "http_error",
            "message": "The request could not be completed",
        }
    }
    assert response.headers["allow"] == "POST"


def test_http_exception_detail_is_not_exposed() -> None:
    response = TestClient(create_contract_app()).get("/explicit-http-error")

    assert response.status_code == 404
    assert response.json() == {
        "error": {
            "code": "http_error",
            "message": "The request could not be completed",
        }
    }
    assert "secret internal detail" not in response.text


def test_contract_fixture_is_not_mounted_or_published_by_production_app() -> None:
    assert "/contract-example" not in {route.path for route in production_app.routes}
    production_schema = production_app.openapi()
    assert "/contract-example" not in production_schema["paths"]
