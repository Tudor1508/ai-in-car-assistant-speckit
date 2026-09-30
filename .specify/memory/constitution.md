<!--
Sync Impact Report
Version change: uninitialized scaffold -> 1.0.0
Modified principles: PRINCIPLE_1_NAME -> I. Modular Boundaries and Ownership;
PRINCIPLE_2_NAME -> II. Compatible, Reusable Frontend;
PRINCIPLE_3_NAME -> III. One Authority for Shared Client State;
PRINCIPLE_4_NAME -> IV. Explicit Contracts and Backend-Enforced Access;
PRINCIPLE_5_NAME -> V. Verified, Accessible User Outcomes.
Added sections: Technology Constraints and Open Decisions; SDD Development and Review.
Removed sections: none.
Follow-up TODOs: none; unresolved technical choices are recorded as open decisions below.
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
documented contract. The backend MUST enforce authorization for every protected operation using
the user's role and permissions. Hiding or disabling interface controls MUST NOT be treated as
authorization. Implementations MUST minimize exposed user data and MUST NOT return secrets or
internal error details to clients.

### V. Verified, Accessible User Outcomes
Specifications MUST define observable acceptance criteria for changed behavior, including relevant
roles, validation, and failure cases. Important behavior MUST have appropriate frontend and backend
tests; API contract or cross-layer changes MUST include integration coverage. Changed interfaces
MUST remain usable at supported screen sizes, provide accessible controls and labels, and present
errors in language users can understand without exposing internal details. Reviews MUST verify the
applicable criteria and tests before accepting a change.

## Technology Constraints and Open Decisions

The defined stack is React, TypeScript, Redux, and Material UI (MUI) for the frontend, and Python
for the backend. Implementations MUST remain compatible with the versions and dependencies declared
by the project; this constitution does not prescribe unprovided versions or additional technology.

The following decisions remain open and MUST be resolved in the relevant specification or plan
before implementation depends on them:
- Supported runtime and dependency versions, package manager, and dependency update policy.
- Python backend framework and project module layout.
- API protocol, schema representation, and compatibility/versioning policy.
- Authentication mechanism, role/permission definitions, and identity lifecycle.
- Data persistence choices and the applicable data retention requirements.
- Test, lint, formatting, and type-check tools and their project commands.

## SDD Development and Review

Work MUST be expressed through Spec Kit specifications, plans, and tasks before implementation.
Specifications MUST state user-visible behavior and acceptance criteria; plans MUST resolve relevant
open decisions and describe frontend/backend ownership, API contracts, authorization, and test
coverage; tasks MUST be small enough to review and trace to those artifacts. Code MUST follow the
formatting, naming, and validation conventions configured in the project. Dependency changes MUST
update the applicable project declarations and lock data together when such lock data is used.

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

**Version**: 1.0.0 | **Ratified**: 2026-09-30 | **Last Amended**: 2026-09-30
