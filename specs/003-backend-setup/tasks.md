# Tasks: Drive Wise Backend Setup

**Input**: Design documents from `/specs/003-backend-setup/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Automated checks are explicitly selected in the plan. Use pytest for the technical health contract and Python compilation for source validation.

**Organization**: Tasks are grouped by user story and ordered by dependency.

## Phase 1: Setup

**Purpose**: Establish the minimal backend files and dependency declarations.

- [X] T001 [P] Create `backend/requirements.txt` with the approved FastAPI 0.115.6 and Uvicorn 0.34.0 runtime dependencies from `specs/003-backend-setup/plan.md` (FR-002, FR-003, FR-007).
- [X] T002 [P] Create `backend/requirements-dev.txt` with the approved pytest 8.3.4 development dependency and a reference to `requirements.txt` (FR-007, SC-004).
- [X] T003 [P] Add `backend/src/__init__.py` as the package marker and keep the source package free of product-domain modules (FR-001, FR-006, FR-010).

## Phase 2: Foundational

**Purpose**: No shared product foundation is required. This feature introduces no database, authentication, persistence, external service, or product API infrastructure.

## Phase 3: User Story 1 - Locate backend code (Priority: P1) - MVP

**Goal**: Contributors can identify `backend/` as the backend root, `backend/src/` as the Python source location, and the constitutional backend ownership boundary.

**Independent Test**: A contributor follows the backend guide from the repository root and identifies the source location, ownership, future module placement, and explicit out-of-scope product behavior within two minutes.

### Implementation for User Story 1

- [X] T004 [P] [US1] Update `backend/README.md` with the backend purpose, ownership boundary, `backend/src/` source location, `backend/tests/` check location, and the explicit absence of product features, persistence, credentials, and external services (FR-001, FR-004, FR-005, FR-006, FR-008, FR-009, FR-010, SC-001, SC-003).
- [X] T005 [US1] Update root `README.md` only if needed to link the backend guide and preserve the frontend/backend ownership boundary established by `001-app-skeleton`; do not add product behavior or unapproved technologies (FR-001, FR-009, SC-001).

**Checkpoint**: US1 is complete when the backend location and ownership are discoverable from repository guidance without inspecting implementation details.

## Phase 4: User Story 2 - Start the backend locally (Priority: P1)

**Goal**: Contributors can install the approved dependencies, start the backend, and verify local availability without external services.

**Independent Test**: From a clean checkout and supported Python runtime, a contributor follows `backend/README.md`, starts Uvicorn, and receives the documented successful `/health` response.

### Tests for User Story 2

- [X] T006 [P] [US2] Add `backend/tests/test_health.py` with a pytest check for `GET /health` returning HTTP 200 and `{ "status": "ok" }` according to `specs/003-backend-setup/contracts/health.md` (FR-003, FR-004, SC-002, SC-004).

### Implementation for User Story 2

- [X] T007 [US2] Implement the minimal FastAPI application and technical `GET /health` route in `backend/src/main.py`; do not add product endpoints, data models, persistence, authentication, or external calls (FR-003, FR-009, FR-010, SC-002, SC-005).
- [X] T008 [US2] Run `python -m compileall src` and `python -m pytest` from `backend/`, fixing only issues introduced by this feature; record the commands in `backend/README.md` (FR-004, FR-007, SC-004).
- [X] T009 [US2] Run the documented Uvicorn command from `backend/` and verify the live `http://127.0.0.1:8000/health` response against the contract; stop the process after verification (FR-003, FR-004, SC-002, SC-004).

**Checkpoint**: US2 is complete when installation, compilation, tests, startup, and the local availability check work from the documented sequence.

## Phase 5: User Story 3 - Understand backend configuration and contribution steps (Priority: P2)

**Goal**: Contributors know what configuration is required and how to add future backend modules without inventing secrets or setup conventions.

**Independent Test**: A contributor can identify all required and optional configuration, the setup sequence, verification commands, and future module location from `backend/README.md`.

### Implementation for User Story 3

- [X] T010 [US3] Document in `backend/README.md` that no environment variables, local configuration file, credentials, database, or external service is required for this baseline, including the local virtual-environment setup sequence (FR-005, FR-007, FR-008, FR-010, SC-003, SC-005).
- [X] T011 [US3] Document in `backend/README.md` the exact Python version range, dependency installation commands, Uvicorn startup command, ready signal, health check, compilation command, pytest command, and future module placement under `backend/src/` (FR-002, FR-003, FR-004, FR-006, SC-001, SC-002, SC-004).

**Checkpoint**: US3 is complete when the guide answers configuration and contribution questions without undocumented steps.

## Phase 6: Polish & Cross-Cutting Review

**Purpose**: Verify traceability, scope boundaries, and clean-checkout reproducibility.

- [X] T012 Review `backend/README.md`, `backend/src/main.py`, `backend/tests/test_health.py`, dependency files, and `specs/003-backend-setup/` against FR-001 through FR-010 and SC-001 through SC-005; remove any product behavior or unapproved dependency (FR-001 through FR-010, SC-001 through SC-005).
- [X] T013 Perform the complete `specs/003-backend-setup/quickstart.md` sequence from a clean checkout or clean working copy, including virtual-environment creation, dependency installation, compilation, pytest, Uvicorn startup, and `/health`; record only required documentation corrections (FR-003, FR-004, FR-005, SC-002, SC-003, SC-004).

## Dependencies & Execution Order

- T001, T002, and T003 can run in parallel.
- T004 and T005 depend on the existing skeleton and can run after setup; T005 is only needed if the root guide lacks the backend link.
- T006 and T007 can run in parallel after T001 and T002; T006 tests the contract implemented by T007.
- T008 depends on T006 and T007. T009 depends on T008.
- T010 and T011 depend on the selected setup commands and can run in parallel with T009, but T013 waits for all documentation and implementation work.
- T012 and T013 are final review tasks; T013 depends on T001-T011.

## Parallel Opportunities

```text
After setup:
Task: T001 Runtime dependency declaration in backend/requirements.txt
Task: T002 Development dependency declaration in backend/requirements-dev.txt
Task: T003 Python package marker in backend/src/__init__.py

After dependency files exist:
Task: T006 Health contract test in backend/tests/test_health.py
Task: T007 Minimal FastAPI app in backend/src/main.py
```

## Implementation Strategy

### MVP First

1. Complete T001-T003 to establish the backend package and dependencies.
2. Complete T004 and T005 to make ownership and source placement discoverable.
3. Complete T006-T009 to deliver and verify the minimal startable backend.
4. Validate the MVP with the US1 and US2 independent tests.

### Incremental Delivery

1. Add no product functionality while implementing the baseline.
2. Document the no-configuration policy and contributor workflow in T010-T011.
3. Run the clean-checkout quickstart and scope review in T012-T013.
4. Keep database, authentication, product routes, external services, and persistence for separate features.
