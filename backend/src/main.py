from fastapi import FastAPI

from src.api.errors import install_error_handlers

app = FastAPI(title="Drive Wise Backend")
install_error_handlers(app)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
