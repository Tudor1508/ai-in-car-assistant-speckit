# Skeleton Startup and Validation Guide

This guide defines the contributor workflow and acceptance checks for the initial skeleton. It is not yet a copy-paste command sequence: the frontend framework/toolchain, backend execution approach, supported versions, and package managers are open decisions in [research.md](research.md). Do not replace the pending command entries with assumptions. Resolve those choices before finalizing this guide in implementation.

## Prerequisites to Record

- Supported frontend runtime and dependency manager, selected for the React and TypeScript baseline.
- Supported Python runtime and backend execution approach.
- Any repository-level environment prerequisite required by the selected approaches.

The contributor guide must give exact versions or supported ranges only after they are agreed. No database, external service, authentication secret, or product data is a prerequisite for this skeleton.

## Startup Sequence to Document

1. Check out the repository and enter its root directory.
2. Install the frontend dependencies using the package manager selected in the plan.
3. Install or prepare the backend using the Python execution approach selected in the plan.
4. Start the frontend with its agreed local development command and confirm its documented ready signal.
5. In a separate terminal, start the backend with its agreed local development command and confirm its documented ready signal.
6. Run the agreed frontend and backend validation commands and report their expected successful outcomes.

The final contributor documentation must replace these descriptions with exact commands, expected local addresses or process output where applicable, and cleanup/stop instructions if the selected tools require them. Do not require a database or external service unless a later approved scope adds one.

## Acceptance Checks

- From a clean checkout, a contributor can locate the frontend and backend areas and their adjacent ownership guidance within two minutes.
- The frontend guidance assigns presentation, interaction, client coordination, and shared client state to the frontend and identifies the required React, TypeScript, Redux, and MUI constraints.
- The backend guidance assigns authoritative business rules, protected data operations, and authorization to Python backend modules.
- The final exact startup commands for both areas work from a clean checkout using only the documented prerequisites; there are no undocumented setup steps.
- The frontend/backend integration guidance requires an explicit API contract for future cross-boundary operations but introduces no endpoint or transport in this skeleton.
- No product workflow, API, persistence, authentication flow, map dependency, or external service is required to complete these checks.