# Tasks: Drive Wise API and Data Foundation

**Input**: Design documents from `/specs/004-api-and-data-foundation/`

**Prerequisites**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Status**: All approved implementation and verification tasks are complete.

**Tests**: Automated contract and persistence checks are required by FR-006, SC-002â€“SC-004, and the constitution. Test tasks are listed before corresponding implementation tasks.

**Organization**: Tasks are grouped by user story. No task introduces product endpoints or domain entities.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with another task in the same stage because it edits a distinct file and has no dependency on incomplete work.
- **[Story]**: Maps to a user story from `spec.md`.
- All paths are repository-relative.

## Phase 1: Approval and Setup

**Purpose**: Resolve the explicit owner-approval gate before any technology-dependent implementation begins. T001 is an approval task, not permission for the implementation agent to self-approve a proposal.

- [X] T001 Record the owner's approval or replacement decision for each proposal in `specs/004-api-and-data-foundation/plan.md` and align `specs/004-api-and-data-foundation/research.md`, `specs/004-api-and-data-foundation/contracts/api-conventions.md`, `specs/004-api-and-data-foundation/contracts/persistence.md`, and `specs/004-api-and-data-foundation/quickstart.md`: protocol; contract format; success/error shape and status mapping; compatibility principle; request/response schema and validation approach; local store and configuration; data-access/ORM approach; schema-evolution mechanism; exact dependency pins; automated check strategy. Until this task is complete, T002â€“T011 are blocked. (FR-002, FR-003, FR-004, FR-007, FR-010, FR-011, SC-007)

## Phase 2: Foundational Dependency Setup

**Purpose**: Apply only the owner-approved dependency and configuration decisions; preserve the exact 003 backend choices.

- [X] T002 Update `backend/requirements.txt` and, only if approved development/test dependencies change, `backend/requirements-dev.txt` with the exact owner-approved compatible pins; retain FastAPI 0.115.6, Uvicorn 0.34.0, and pytest 8.3.4 from 003 unless the owner explicitly superseded them. (depends on T001; FR-009, FR-010, SC-007)

**Checkpoint**: Do not start user-story implementation until T001 is complete and dependencies match the approved plan. T002 must not add a library that was not recorded in T001.

## Phase 3: User Story 1 - Apply a shared API contract convention (Priority: P1)

**Goal**: Contributors can document and verify request, success, validation-error, and unexpected-error outcomes using one approved convention.

**Independent Test**: Run the API contract checks against an isolated test-only app/handler fixture. Verify the approved success shape, invalid-input status/error shape, and unexpected-failure status/error shape; confirm no test endpoint is mounted in the application and `/health` remains unchanged.

### Tests for User Story 1

- [X] T003 [P] [US1] Add contract checks in `backend/tests/test_api_conventions.py` for a successful test-fixture operation, invalid input, and unexpected failure using only the approved schema, status mapping, and safe error fields; verify the error contains no exception text, stack trace, secret, or internal path and the fixture is not included in `backend/src/main.py`. (depends on T001, T002; FR-001â€“FR-004, FR-009, SC-002)

### Implementation for User Story 1

- [X] T004 [P] [US1] Implement the owner-approved request/response schema, boundary validation, common success/error handling, and OpenAPI contract integration under `backend/src/api/` and `backend/src/main.py`; preserve the existing `GET /health` response `{ "status": "ok" }` and add no product or test endpoint. (depends on T003; FR-001â€“FR-004, FR-009, FR-012, FR-013, SC-001, SC-002)

**Checkpoint**: T003 passes against T004; shared contract documentation describes the same behavior and `/health` remains unchanged.

## Phase 4: User Story 2 - Establish reusable data persistence foundations (Priority: P1)

**Goal**: Contributors can configure local persistence and use a reusable data-access and schema-evolution foundation without any product model.

**Independent Test**: Using the approved local configuration and an isolated temporary store, initialize the store, write and read a temporary non-product record with matching values, clean it up, and verify fresh/current schema-evolution behavior.

### Tests for User Story 2

- [X] T005 [P] [US2] Add persistence lifecycle checks in `backend/tests/test_persistence.py` using an isolated temporary store; verify initialization/access, matching write/read values, cleanup, and that the contributor's default store is untouched. (depends on T001, T002; FR-005, FR-006, SC-003)
- [X] T006 [P] [US2] Add fresh-store and already-current-store schema-evolution checks in `backend/tests/test_schema_evolution.py` using the owner-approved migration command/mechanism; verify current revision state and repeat behavior without creating product tables. (depends on T001, T002; FR-007, SC-004)

### Implementation for User Story 2

- [X] T007 [P] [US2] Implement the owner-approved local store configuration and reusable connection/session or data-access boundary under `backend/src/data/`; use no product models and ensure isolated tests cannot write to the contributor's default store. (depends on T005; FR-005, FR-006, FR-010, SC-003)
- [X] T008 [US2] Add the owner-approved schema-evolution configuration and initial infrastructure-only revision under `backend/migrations/`; ensure the initial revision creates no product tables and supports fresh/current stores. (depends on T007, T006; FR-007, FR-010, SC-004)

**Checkpoint**: T005 and T006 pass; the configured data boundary and schema-evolution process are reusable and contain no product data model.

## Phase 5: User Story 3 - Extend the foundations without product scope creep (Priority: P2)

**Goal**: Contributors can find the approved API and data conventions, setup instructions, and verification commands in the backend guide.

**Independent Test**: From a clean checkout with documented prerequisites, a contributor can locate the source boundaries and follow the approved configuration, schema setup, and check commands; a scope review finds no excluded product behavior.

### Implementation for User Story 3

- [X] T009 [US3] Update `backend/README.md` with links to the approved API contract guidance, request/success/error convention, local persistence setting and default, schema setup procedure, exact dependency preparation and verification commands, while preserving 003 startup and `/health` instructions. (depends on T004, T007, T008; FR-008, FR-009, FR-012, SC-001, SC-005)

## Phase 6: Polish and Cross-Cutting Verification

**Purpose**: Verify clean-checkout instructions, traceability, and strict scope before accepting the foundation.

- [X] T010 Run the approved `specs/004-api-and-data-foundation/quickstart.md` sequence from a clean checkout: install exact pins, initialize/evolve a fresh temporary store, run `python -m compileall src` and `python -m pytest`, and repeat schema setup on an already-current store; correct only discrepancies between the approved docs and observed behavior. (depends on T003â€“T009; FR-008, FR-009, SC-003â€“SC-005)
- [X] T011 Review `backend/src/`, `backend/tests/`, `backend/migrations/`, `backend/README.md`, and all 004 design artifacts against FR-001â€“FR-013 and SC-001â€“SC-007; confirm there is no authentication, roles, product model, product endpoint, vehicle/trip/history behavior, external integration, unapproved dependency, or changed `/health` contract. (depends on T010; FR-009â€“FR-013, SC-006, SC-007)

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1**: T001 requires an owner to approve or revise all listed design decisions. It does not authorize the implementation agent to choose on the owner's behalf.
- **Phase 2**: T002 depends on T001 and applies only the exact recorded dependency decisions.
- **US1 and US2 test tasks**: T003, T005, and T006 may be prepared in parallel after T002 because they use different test files and the same already-approved contracts.
- **US1 implementation**: T004 depends on the failing contract checks in T003.
- **US2 implementation**: T007 depends on T005; T008 depends on T007 and T006.
- **US3 documentation**: T009 depends on approved behavior existing in T004, T007, and T008.
- **Polish**: T010 and T011 follow all implementation and documentation work.

### User Story Dependencies

- **US1 (P1)**: Starts only after owner approval and dependency setup (T001â€“T002); independent of US2 implementation.
- **US2 (P1)**: Starts only after owner approval and dependency setup (T001â€“T002); independent of US1 implementation.
- **US3 (P2)**: Depends on US1 and US2 because its contributor guide must describe the final approved interfaces and commands.

### Parallel Opportunities

- After T001â€“T002, T003, T005, and T006 can be authored concurrently in separate test files.
- After those tests are ready, T004 and T007 can proceed concurrently in separate `api/` and `data/` source areas.
- T008 follows T007; T009 follows both stories.

## Implementation Strategy

### Approval-gated MVP

1. Complete T001 with owner approval or replacement decisions; update all impacted design artifacts.
2. Complete T002 with only the approved pins.
3. Deliver US1 (T003â€“T004) and US2 (T005â€“T008) as separate independently verifiable increments.
4. Complete US3 documentation (T009), then run T010â€“T011.

If an owner rejects a proposal, stop before the dependent implementation task, revise the plan/contracts/quickstart, and update the affected tasks. Do not substitute an unapproved alternative while implementing.

## Scope Guard

No task in this list implements authentication, identity, roles, vehicles, routes, planning, trip history, product data models, product workflow endpoints, frontend work, or external integrations. No production database is selected by the current plan.

## Phase 7: Convergence

**Purpose**: Close verification gaps found when comparing the current implementation scope and tasks with the constitution and approved contract artifacts. These verification tasks use the decisions recorded in T001 and dependencies from T002.

- [X] T012 Add an HTTP-level integration check in `backend/tests/test_api_conventions.py` using the owner-approved protocol and test client; send success, invalid-input, and unexpected-failure requests through the test application's routing, validation, handlers, and response serialization, then assert the approved statuses and bodies while confirming the production app keeps `/health` unchanged and exposes no test route, per Constitution V and US1/AC2â€“AC3.
- [X] T013 Extend `backend/tests/test_api_conventions.py` to verify that the contract representation approved in T001 describes the representative request, success, and error shapes and status outcomes documented in `specs/004-api-and-data-foundation/contracts/api-conventions.md`; if the approved format provides a machine-readable production contract, also confirm the test fixture is absent from it, per FR-001â€“FR-002, SC-001â€“SC-002.
