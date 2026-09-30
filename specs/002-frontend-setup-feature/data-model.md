# Data Model: Drive Wise Frontend Setup

This feature introduces no product data entities or persisted state. Redux is present only as the required shared-client-state foundation; no product reducer, domain state, API data shape, or persistence is defined here.

No database or browser persistence choice is required. This matches the specification's frontend-only setup scope and leaves all data decisions to the feature that introduces product data.
