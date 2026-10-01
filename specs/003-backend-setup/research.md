# Research: Drive Wise Backend Setup

## Decision 1: Python runtime

- **Decision**: Support Python 3.11, 3.12, and 3.13; verify locally with Python 3.13.
- **Rationale**: Python is required by the constitution, the range preserves current
  supported runtimes, and Python 3.13 is available in the repository environment.
- **Alternatives considered**: Python 3.11 only was rejected because it needlessly
  narrows contributor compatibility. Python 3.10 was rejected because it is below
  the selected support floor.

## Decision 2: Web framework and execution

- **Decision**: Use FastAPI 0.115.6 served by Uvicorn 0.34.0.
- **Rationale**: This provides a small typed Python web-service baseline with a
  direct local command and an observable technical health route. The choice is a
  new plan decision, not an approval inferred from the legacy README.
- **Alternatives considered**: The Python standard library HTTP server was rejected
  because it would create a temporary execution pattern that does not match the
  intended backend service boundary. Flask was rejected because FastAPI provides a
  clearer typed service baseline for future contract work.

## Decision 3: Dependency management

- **Decision**: Use `pip` with `backend/requirements.txt` for runtime dependencies
  and `backend/requirements-dev.txt` for pytest.
- **Rationale**: This is the smallest setup consistent with the existing Python
  repository and requires no additional dependency manager.
- **Alternatives considered**: `uv` was not selected as the documented requirement
  because it is not established as a project convention. Poetry was rejected as
  unnecessary for this minimal baseline.

## Decision 4: Configuration

- **Decision**: No environment variables, configuration file, credentials, or
  external service settings are required by the baseline.
- **Rationale**: The feature has no product behavior or external integration. An
  explicit no-configuration statement prevents contributors from inventing secrets.
- **Alternatives considered**: A placeholder `.env` file was rejected because it
  would imply configuration that the feature does not need.

## Decision 5: Verification

- **Decision**: Use pytest 8.3.4, Python compilation, and a live `/health` request.
- **Rationale**: These checks cover source validity, the technical route contract,
  and the real startup path without adding product tests.
- **Alternatives considered**: No automated tests was rejected because the baseline
  has observable startup behavior that should be checked automatically.

## Explicitly deferred

Database, ORM, migrations, authentication, authorization roles, product routes,
API versioning, external services, deployment, logging, and product data models
remain outside this feature.