import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_DIR / ".env")


def get_allowed_origins() -> list[str]:
    configured = os.environ.get("DRIVE_WISE_ALLOWED_ORIGINS")
    if not configured:
        raise ValueError("DRIVE_WISE_ALLOWED_ORIGINS must be configured")
    origins = [origin.strip() for origin in configured.split(",") if origin.strip()]
    if not origins or "*" in origins:
        raise ValueError("Credentialed CORS requires explicit allowed origins")
    return origins


SESSION_IDLE_SECONDS = 30 * 60
SESSION_ABSOLUTE_SECONDS = 8 * 60 * 60
COOKIE_NAME = "__Host-dw_session"
