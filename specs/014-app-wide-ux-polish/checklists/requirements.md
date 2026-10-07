# Specification Quality Checklist: App-wide UX Polish

**Purpose**: Track specification readiness and decisions that gate implementation or release.  
**Created**: 2026-10-07  
**Feature**: [spec.md](../spec.md)

## Clarifications

- [x] OQ-1 resolved: deleting a visible favorite fills its slot from the next saved route when one exists; the collapsed list shows at most two and “Show more” reveals the rest.
- [x] OQ-2 resolved: the project owner supplies Contact and Privacy content; no text or details may be invented.
- [x] The specification defines the interim state while owner text is unavailable: Contact and Privacy content is blocked and the page communicates that status.

## Requirement Quality

- [x] No unresolved open questions or `[NEEDS CLARIFICATION]` markers remain.
- [x] The two previously open decisions are reflected in user scenarios, functional requirements, traceability, assumptions, and success criteria where relevant.
- [x] Favorite removal behavior is observable for both successful removal and failed removal.
- [x] Contact/Privacy content ownership and the blocked-until-supplied state are explicit and testable.
- [x] The specification continues to prohibit fabricated contact details and legal/privacy claims.
- [x] Existing authentication, authorization, route, vehicle-range, and AI behavior boundaries remain explicit.

## Owner Content Gate

- [ ] Project owner supplies approved Contact page details/text.
- [ ] Project owner supplies approved Privacy page text.

Until both items above are supplied and approved, the pages may expose their routes and footer links but MUST keep their content blocked with a clear pending-owner-content message. This gate does not permit placeholder legal claims or invented contact information.
