"""Isolated local FastAPI server for concierge browser integration tests."""

import atexit
import os
import sys
import tempfile
from pathlib import Path

import dotenv

_database_directory = tempfile.TemporaryDirectory(prefix="drive-wise-concierge-test-")
_database_file = Path(_database_directory.name) / "assistant.sqlite3"
os.environ["DRIVE_WISE_DATABASE_URL"] = f"sqlite:///{_database_file.as_posix()}"
os.environ["DRIVE_WISE_ALLOWED_ORIGINS"] = "http://127.0.0.1:3011"
os.environ["OPENAI_API_KEY"] = "test-only-fake-key"
# Keep the isolated fake-provider test server independent from local secrets.
dotenv.load_dotenv = lambda *args, **kwargs: False
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.assistant.provider import ProviderUnavailable
from src.assistant.routes import get_answer_provider, get_speech_provider, get_transcription_provider
from src.data.database import create_engine
from src.data.models import Base
from src.main import create_app

engine = create_engine("sqlite://")
Base.metadata.create_all(engine)
app = create_app(engine=engine)


async def fake_provider(question: str, locale: str | None, history: list[dict[str, str]]):
    if question.lower().startswith("fail"):
        raise ProviderUnavailable
    if history:
        context = " | ".join(f"{message['role']}: {message['text']}" for message in history)
        return {
            "text": f"Follow-up understood from earlier conversation: {context}. I can use these details to answer the new question.",
            "language": "ro-RO" if locale == "ro" else "en-US",
            "is_demo": False,
        }
    return {
        "text": f"Fake {locale} answer for: {question}",
        "language": "ro-RO" if locale == "ro" else "en-US",
        "is_demo": False,
    }


app.dependency_overrides[get_answer_provider] = lambda: fake_provider


async def fake_speech_provider(text: str, language: str) -> bytes:
    return b"fake-mp3-audio"


app.dependency_overrides[get_speech_provider] = lambda: fake_speech_provider


async def fake_transcription_provider(audio: bytes, content_type: str) -> str:
    return "Fake transcript from approved recording"


app.dependency_overrides[get_transcription_provider] = lambda: fake_transcription_provider
atexit.register(_database_directory.cleanup)
atexit.register(engine.dispose)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8765, log_level="warning")
