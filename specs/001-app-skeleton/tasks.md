---

description: "Task list for the Drive Wise application skeleton"
---

# Tasks: Drive Wise Application Skeleton

**Input**: Design documents from `/specs/001-app-skeleton/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: No automated test framework is selected or explicitly requested. Each task includes a concrete acceptance check; the startup workflow is verified manually from a clean checkout. Do not add test-tool dependencies as part of these tasks.

**Organization**: Tasks are grouped by user story. Open decisions needed for startup are explicit blockers; they are not resolved by assuming a legacy technology.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel after listed dependencies, in different files
- **[Story]**: User-story traceability (`US1`, `US2`)
- Every task names its target file path and expected verification

## Path Conventions

- Frontend: `frontend/`
- Backend: `backend/`
- Contributor entry point: repository-root `README.md`
- Feature decisions and design references: `specs/001-app-skeleton/`

## Phase 1: Setup (Shared Structure)

**Purpose**: Create only the planned, trackable frontend/backend directory skeleton.

- [X] T001 Add empty-directory markers at `frontend/src/.gitkeep`, `frontend/tests/.gitkeep`, `backend/src/.gitkeep`, and `backend/tests/.gitkeep` per `specs/001-app-skeleton/plan.md`; verify all four paths are tracked and no framework, service, database, API, or product code is introduced.

## Phase 2: Foundational

No additional shared runtime, database, authentication, routing, or API foundation is required or approved for this feature. T001 is the only shared structural prerequisite; resolve toolchain decisions only for the startup story that needs them.

## Phase 3: User Story 1 - Find the right application area (Priority: P1) - MVP

**Goal**: Contributors can distinguish frontend/backend locations and understand their ownership without undocumented team knowledge.

**Independent Test**: From the repository root, a contributor unfamiliar with the project identifies the frontend and backend areas, their responsibilities, and where new code belongs within two minutes; empty areas still explain their purpose.

### Implementation for User Story 1

- [X] T002 [P] [US1] Create `frontend/README.md` documenting the frontend purpose, React/TypeScript/Redux/MUI constraints, ownership of presentation, interaction and client coordination, and that framework/tooling decisions remain open; verify it names no unapproved framework or product feature (FR-002, FR-004, SC-002).
- [X] T003 [P] [US1] Create `backend/README.md` documenting Python backend ownership of authoritative business rules, protected data operations and authorization, without defining roles, endpoints, persistence or framework; verify those exclusions are explicit (FR-002, FR-004, SC-002).
- [X] T004 [US1] Replace the generic starter content in repository `README.md` with a Drive Wise contributor overview, the `frontend/` and `backend/` layout, links to both area guides, code-placement guidance, and the future explicit-contract boundary; verify a contributor can find each area and its owner within two minutes and that product functionality is marked out of scope (FR-001, FR-002, FR-005, FR-007, SC-001, SC-002).

**Checkpoint**: US1 is independently acceptable when T001-T004 are complete and the independent test above passes. No startup framework choice is needed to review ownership and layout.

## Phase 4: User Story 2 - Start both parts locally (Priority: P2)

**Goal**: Contributors can follow exact, approved prerequisites and commands to start frontend and backend locally without undocumented setup.

**Independent Test**: On a clean checkout and an environment meeting the documented prerequisites, a contributor follows the README instructions, starts each area, sees the stated ready signal, and needs no database or external service.

### Implementation for User Story 2

- [ ] T005 [P] [US2] After explicit project-owner approval, record only the minimum frontend execution/framework, backend execution/framework, supported runtime versions, and package-manager choices needed for local startup in `specs/001-app-skeleton/plan.md` and `specs/001-app-skeleton/research.md`; preserve React/TypeScript/Redux/MUI and Python, and leave Tailwind CSS, Leaflet, database/ORM/migrations, API protocol, authentication, and external services open. If approval is unavailable, leave T005 blocked and do not add dependencies or startup commands (FR-004, FR-006, SC-004).
- [ ] T006 [US2] Using only decisions recorded by T005, add exact prerequisites, setup and frontend/backend start commands, expected ready signals, and any required local addresses to `README.md`, `frontend/README.md`, and `backend/README.md`; verify the commands make no assumption about an unselected framework, service, database, or API protocol (FR-003, SC-003).
- [ ] T007 [US2] Follow the instructions in `README.md`, `frontend/README.md`, and `backend/README.md` from a clean checkout; verify each area starts independently and in the documented two-terminal workflow using only stated prerequisites, then record any command or prerequisite correction in those files (FR-003, SC-003).

**Checkpoint**: US2 is independently acceptable when T005-T007 are complete, the startup guide contains exact approved commands, and the clean-checkout independent test above passes.

## Phase 5: Polish & Cross-Cutting Review

**Purpose**: Verify traceability, scope boundaries, and all measurable outcomes without adding product behavior.

- [ ] T008 Review `README.md`, `frontend/README.md`, `backend/README.md`, `specs/001-app-skeleton/plan.md`, and `specs/001-app-skeleton/research.md` against FR-001 through FR-007 and SC-001 through SC-004; verify the stack matches the constitution, all unapproved legacy choices remain open, and no product workflow or external integration was implemented.

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 has no prerequisites.
- **Foundational (Phase 2)**: No additional tasks; there is no shared product infrastructure in scope.
- **US1 (Phase 3)**: T002 and T003 depend on T001 and can run in parallel. T004 depends on T002 and T003.
- **US2 (Phase 4)**: T005 can run in parallel with T002/T003 after T001, but is blocked until the project owner approves the minimum startup toolchain. T006 depends on T004 and T005. T007 depends on T006.
- **Polish (Phase 5)**: T008 depends on T004 and T007.

### User Story Dependencies

- **US1 (P1)**: Starts after T001; no dependencies on a product framework, service, database, or API.
- **US2 (P2)**: Uses the directory baseline from T001 and contributor documentation from US1. Exact startup documentation is blocked on the explicit toolchain decision in T005; it must not be guessed.

### Parallel Opportunities

- After T001, T002 (`frontend/README.md`) and T003 (`backend/README.md`) may run in parallel.
- T005 edits only `plan.md` and `research.md` and may be prepared in parallel with T002/T003, but it cannot be completed without project-owner approval.
- T004 must wait for both area guides; T006 must wait for T004 and T005; T007 and T008 are sequential follow-ups.

## Parallel Example: User Story 1

```text
Task: T002 Create frontend ownership guidance in frontend/README.md
Task: T003 Create backend ownership guidance in backend/README.md
```

## Parallel Example: User Story 2

```text
After T001, prepare the approval request for T005 while the US1 area guides are written:
Task: T005 Record approved minimum startup toolchain decisions in plan.md and research.md
Task: T002 Create frontend ownership guidance in frontend/README.md
Task: T003 Create backend ownership guidance in backend/README.md

Do not start T006 until T005 is approved and T004 has updated the repository README.
```

## Implementation Strategy

### MVP First (User Story 1)

1. Complete T001 to create the trackable directory baseline.
2. Complete T002 and T003 in parallel, then T004.
3. Stop and validate US1 using its independent two-minute repository walkthrough.

### Incremental Delivery

1. Deliver US1 without choosing or installing a runtime framework.
2. Obtain approval for the minimum startup toolchain in T005; leave unrelated legacy choices open.
3. Complete T006 and verify T007 from a clean checkout.
4. Complete the scope and acceptance review in T008.

## Notes

- All task lines use `- [ ]`, sequential IDs, an optional `[P]` only where parallel work is valid, and a `[US1]`/`[US2]` label only in user-story phases.
- Automated test tasks are omitted because test tooling is undecided and not explicitly requested; acceptance verification is included in the relevant implementation tasks.
- No task implements route planning, vehicle management, map behavior, AI Concierge, profiles, dashboards, authentication flows, database persistence, or external integrations.

## Phase 6: Convergence

- [ ] T009 Obtain and record explicit project-owner approval for the minimum frontend run/framework choice, Python backend run/framework choice, supported runtime versions, and package managers in `specs/001-app-skeleton/plan.md` and `specs/001-app-skeleton/research.md`; do not select any candidate without approval, and leave Tailwind CSS, Leaflet, persistence, API protocol, authentication, and external services open per FR-003, SC-003, and US2/AC1-AC2 (missing).
