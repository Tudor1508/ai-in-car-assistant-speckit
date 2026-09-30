# Frontend/Backend Contract Boundary

This skeleton introduces no API endpoint or transport. The frontend and backend are separate ownership areas, and any future operation crossing that boundary must use an explicit API contract, as required by the project constitution.

When a product feature introduces an operation, its contract must define request, response, and error shapes. Backend input validation and authorization for protected operations remain backend responsibilities. The protocol, schema representation, compatibility/versioning policy, and location for concrete contracts are open decisions for the feature that needs them; this note does not select them.