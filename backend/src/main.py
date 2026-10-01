from fastapi import FastAPI

app = FastAPI(title="Drive Wise Backend")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}