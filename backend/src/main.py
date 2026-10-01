from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import Engine

from src.auth.config import get_allowed_origins
from src.auth.routes import router as auth_router
from src.api.errors import install_error_handlers
from src.data.database import create_engine


def create_app(engine: Engine | None = None) -> FastAPI:
    application = FastAPI(title="Drive Wise Backend", version="1.0.0", openapi_version="3.1.0")
    application.state.engine = engine or create_engine()
    application.add_middleware(
        CORSMiddleware,
        allow_origins=get_allowed_origins(),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "X-CSRF-Token"],
    )
    application.include_router(auth_router)
    install_error_handlers(application)

    @application.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return application


app = create_app()
