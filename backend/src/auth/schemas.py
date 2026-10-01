from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


def valid_email(value: str) -> str:
    value = value.strip()
    if len(value) > 320 or value.count("@") != 1 or any(ch.isspace() for ch in value):
        raise ValueError("Enter a valid email address")
    local, domain = value.rsplit("@", 1)
    if not local or "." not in domain or domain.startswith(".") or domain.endswith("."):
        raise ValueError("Enter a valid email address")
    return value


def valid_password(value: str) -> str:
    if (len(value) < 8 or not any(c.isupper() for c in value)
            or not any(c.isdigit() for c in value)
            or not any(not c.isalnum() for c in value)):
        raise ValueError("Password does not meet the required policy")
    return value


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=120)
    email: str
    password: str
    password_confirmation: str

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Name is required")
        return value

    @field_validator("email")
    @classmethod
    def clean_email(cls, value: str) -> str:
        return valid_email(value)

    @field_validator("password")
    @classmethod
    def password_policy(cls, value: str) -> str:
        return valid_password(value)

    @model_validator(mode="after")
    def matching_passwords(self):
        if self.password != self.password_confirmation:
            raise ValueError("Passwords do not match")
        return self


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str
    password: str


class ProfilePatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str | None = Field(default=None, min_length=1, max_length=120)
    email: str | None = None
    current_password: str | None = None

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("Name is required")
        return value

    @field_validator("email")
    @classmethod
    def clean_email(cls, value: str | None) -> str | None:
        return valid_email(value) if value is not None else None

    @model_validator(mode="after")
    def check_changes(self):
        if self.name is None and self.email is None:
            raise ValueError("At least one profile field is required")
        if self.email is None and self.current_password is not None:
            raise ValueError("Current password is only accepted for email changes")
        return self


class PasswordChangeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    current_password: str
    new_password: str
    new_password_confirmation: str

    @field_validator("new_password")
    @classmethod
    def password_policy(cls, value: str) -> str:
        return valid_password(value)

    @model_validator(mode="after")
    def matching_passwords(self):
        if self.new_password != self.new_password_confirmation:
            raise ValueError("Passwords do not match")
        return self


class DeactivateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    current_password: str | None = None
    confirmation: str


class AccountResponse(BaseModel):
    id: str
    name: str
    email: str
    email_verified: Literal[False] = False
    role: Literal["user", "admin", "producer"]


class CsrfResponse(BaseModel):
    csrf_token: str


class LoginResponse(BaseModel):
    account: AccountResponse
    csrf_token: str


class StatusResponse(BaseModel):
    status: Literal["signed_out", "password_changed", "disabled"]
