<!--
Sync Impact Report
Version change: 1.1.0 -> 1.2.0
Modified principles: none.
Added sections: VI. Bounded, Transparent Travel Assistance.
Removed sections: none.
Follow-up TODOs: production hosting/database, travel-information and AI providers, and speech
recognition/synthesis choices remain undecided by design.
-->
# Drive Wise Constitution

## Core Principles

### I. Modular Boundaries and Ownership
Frontend modules MUST own presentation, user interaction, and client-side coordination. The Python
backend MUST own authoritative business rules, protected data operations, and authorization.
Modules MUST communicate across the frontend/backend boundary only through explicit API contracts.
Specifications and plans MUST identify ownership and dependencies for changes that cross modules.

### II. Compatible, Reusable Frontend
React and TypeScript code MUST follow the project configuration and supported dependency versions;
changes MUST pass the configured type checks. Components MUST have focused responsibilities, use
typed public interfaces, and be reused when they represent shared behavior. The interface MUST use
Material UI (MUI) consistently for standard controls and established project patterns. Exceptions
and any necessary type-check suppression MUST be justified in the change review.

### III. One Authority for Shared Client State
Redux MUST hold shared client state that is consumed or changed across components. A value MUST NOT
be maintained as competing copies in Redux and component state; component state MAY hold transient,
component-local interaction state. State ownership and data flow MUST be identifiable in the
implementation and testable for the affected user flows.

### IV. Explicit Contracts and Backend-Enforced Access
Frontend/backend APIs MUST define and document request, response, and error shapes. Data MUST be
validated at backend input boundaries; frontend code MUST handle responses according to the
documented contract. Product APIs MUST use the approved HTTP/JSON conventions and FastAPI-generated
OpenAPI schemas. Success and error responses MUST use the documented `data` and safe `error`
envelopes, except for explicitly established contracts such as `/health`. Published contract
changes MUST be backward-compatible by default; a breaking change requires an explicit decision
and review of affected consumers. The backend MUST enforce authorization for every protected
operation using the user's role and permissions. Hiding or disabling interface controls MUST NOT
be treated as authorization. Implementations MUST minimize exposed user data and MUST NOT return
secrets or internal error details to clients.

### V. Verified, Accessible User Outcomes
Specifications MUST define observable acceptance criteria for changed behavior, including relevant
roles, validation, and failure cases. Important behavior MUST have appropriate frontend and backend
tests; API contract or cross-layer changes MUST include integration coverage. Changed interfaces
MUST remain usable at supported screen sizes, provide accessible controls and labels, and present
errors in language users can understand without exposing internal details. Reviews MUST verify the
applicable criteria and tests before accepting a change.

### VI. Bounded, Transparent Travel Assistance
AI travel assistance MUST stay within its documented travel scope and redirect unrelated requests
politely. It MUST respond in the user's language, ask for essential missing details, and label
distance or duration estimates as approximate. It MUST distinguish suggestions from verified facts
and MUST NOT present unverified availability as confirmed. User-provided conversation content MUST
be limited to the requested assistance and MUST NOT expose credentials, private account data, or
internal service details. Voice input MUST remain under user control for review before submission;
voice capability failures MUST leave text interaction available. These rules keep generated travel
guidance understandable, bounded, and safe to act on.

## Technology Constraints and Open Decisions

The frontend stack is Next.js App Router, React, TypeScript, Redux Toolkit, Material UI (MUI), and
Leaflet where maps are needed. The backend stack is Python with FastAPI and Uvicorn. Product API
schemas use Pydantic and FastAPI-generated OpenAPI 3.1. Persistence uses SQLAlchemy and Alembic;
SQLite is approved for local development and isolated tests only. Production hosting and production
database choices are not established by these local development decisions.

The following decisions remain open and MUST be resolved in the relevant specification or plan
before implementation depends on them:
- Production hosting, deployment, and production database.
- Future identity-provider integrations and account verification workflows.
- Approved AI response and travel-information sources, including their data use and retention terms.
- Speech recognition and speech synthesis providers and supported language coverage.
- Domain-specific data retention requirements and any production data migration policy.
- Additional test, lint, formatting, and type-check tools beyond those declared in project manifests
  and contributor documentation.

## SDD Development and Review

Work MUST be expressed through Spec Kit specifications, plans, and tasks before implementation.
Specifications MUST state user-visible behavior and acceptance criteria; plans MUST resolve relevant
open decisions and describe frontend/backend ownership, API contracts, authorization, and test
coverage; tasks MUST be small enough to review and trace to those artifacts. Code MUST follow the
formatting, naming, and validation conventions configured in the project. Dependency changes MUST
update the applicable project declarations and lock data together when such lock data is used.
Supported runtime and dependency versions MUST follow project manifests, lockfiles, and setup
documentation; versions MUST NOT be inferred from legacy references or incidental local state.

Every implementation change MUST receive code review. Reviewers MUST check traceability to the
specification and tasks, contract compatibility, backend authorization, validation and error
handling, relevant tests, accessibility, and compatibility with declared dependencies. Any
exception to a principle MUST include its reason and scope in the relevant plan and be accepted in
review; unresolved product or technical choices MUST remain explicit rather than being assumed.

## Governance

This constitution governs Drive Wise specifications, plans, tasks, implementation, and reviews.
Amendments MUST document their rationale and impact, receive project review, and update the version
and last-amended date. Versioning follows MAJOR.MINOR.PATCH: MAJOR for incompatible governance
changes, MINOR for new or materially expanded principles or sections, and PATCH for clarifications
that do not change requirements. Reviewers MUST assess compliance against this constitution and
record justified exceptions in the relevant plan and review.

**Version**: 1.2.0 | **Ratified**: 2026-09-30 | **Last Amended**: 2026-10-06
