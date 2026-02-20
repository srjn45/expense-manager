"""Category API schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CategoryCreate(BaseModel):
    """Request body for creating a category."""

    name: str = Field(..., min_length=1, max_length=100)
    color: str | None = Field(None, max_length=20)

    @field_validator("name", "color", mode="before")
    @classmethod
    def strip_whitespace(cls, v: str | None) -> str | None:
        if isinstance(v, str):
            return v.strip() or None
        return v

    @field_validator("name", mode="after")
    @classmethod
    def reject_empty_name(cls, v: str) -> str:
        if not v:
            raise ValueError("must not be empty")
        return v

    @field_validator("color", mode="after")
    @classmethod
    def reject_empty_color_when_present(cls, v: str | None) -> str | None:
        if v is not None and not v:
            raise ValueError("must not be empty when present")
        return v


class CategoryResponse(BaseModel):
    """Response shape for a single category."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    color: str | None
    active: bool
    created_at: datetime = Field(serialization_alias="createdAt")
