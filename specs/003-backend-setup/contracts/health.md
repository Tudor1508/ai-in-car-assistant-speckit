# Technical Health Check Contract

## `GET /health`

Purpose: confirm that the minimal backend process is available locally.

Request:

- Method: `GET`
- Path: `/health`
- Request body: none
- Authentication: none

Success response:

- Status: `200 OK`
- Content type: `application/json`
- Body: `{ "status": "ok" }`

The route is technical infrastructure only. It does not expose product data,
perform authorization, access persistence, or call an external service.