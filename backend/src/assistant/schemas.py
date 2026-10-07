import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

MAX_CONTEXT_MESSAGES = 10
MAX_CONTEXT_MESSAGE_CHARACTERS = 4000
MAX_TOTAL_CONTEXT_CHARACTERS = 8000


class AssistantStatusResponse(BaseModel):
    enabled: bool
    availability: Literal["available", "temporarily_unavailable"]
    provider: str | None
    charge_notice: str


class AssistantConversationMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: Literal["user", "assistant"]
    text: str = Field(min_length=1, max_length=MAX_CONTEXT_MESSAGE_CHARACTERS)

    @field_validator("text")
    @classmethod
    def trim_message(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Conversation message cannot be blank")
        return value


class AssistantMessageRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str = Field(min_length=1, max_length=2000)
    locale: Literal["ro", "en"]
    history: list[AssistantConversationMessage] = Field(default_factory=list, max_length=MAX_CONTEXT_MESSAGES)

    @field_validator("question")
    @classmethod
    def trim_question(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Question cannot be blank")
        return value

    @model_validator(mode="after")
    def validate_context_size(self):
        total_characters = len(self.question) + sum(len(message.text) for message in self.history)
        if total_characters > MAX_TOTAL_CONTEXT_CHARACTERS:
            raise ValueError(f"Question and conversation history cannot exceed {MAX_TOTAL_CONTEXT_CHARACTERS} characters")
        return self


class AssistantReply(BaseModel):
    text: str
    language: str = Field(min_length=2, max_length=35)
    is_demo: Literal[False] = False

    @field_validator("language")
    @classmethod
    def validate_language_tag(cls, value: str) -> str:
        if not re.fullmatch(r"[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*", value):
            raise ValueError("Response language must be a BCP 47 language tag")
        return value


class AssistantSpeechRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str = Field(min_length=1, max_length=4000)
    language: str = Field(min_length=2, max_length=35)

    @field_validator("text")
    @classmethod
    def trim_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Text cannot be blank")
        return value

    @field_validator("language")
    @classmethod
    def validate_language_tag(cls, value: str) -> str:
        if not re.fullmatch(r"[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*", value):
            raise ValueError("Language must be a BCP 47 language tag")
        return value


class AssistantMessageResponse(BaseModel):
    reply: AssistantReply
