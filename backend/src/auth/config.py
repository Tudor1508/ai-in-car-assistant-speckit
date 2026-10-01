import os


def get_allowed_origins() -> list[str]:
    configured = os.environ.get("DRIVE_WISE_ALLOWED_ORIGINS")
    origins = (
        [origin.strip() for origin in configured.split(",") if origin.strip()]
        if configured
        else ["http://localhost:3000"]
    )
    if not origins or "*" in origins:
        raise ValueError("Credentialed CORS requires explicit allowed origins")
    return origins


SESSION_IDLE_SECONDS = 30 * 60
SESSION_ABSOLUTE_SECONDS = 8 * 60 * 60
COOKIE_NAME = "__Host-dw_session"
