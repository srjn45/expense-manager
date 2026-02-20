"""Unit tests for CategoryCreate schema (validator)."""

import pytest
from pydantic import ValidationError

from app.schemas.category import CategoryCreate


def test_category_create_valid_without_color():
    """Valid name without color passes."""
    obj = CategoryCreate(name="Food")
    assert obj.name == "Food"
    assert obj.color is None


def test_category_create_valid_with_color():
    """Valid name and color pass."""
    obj = CategoryCreate(name="Food", color="#ff0000")
    assert obj.name == "Food"
    assert obj.color == "#ff0000"


def test_category_create_strips_whitespace():
    """Leading/trailing whitespace is stripped."""
    obj = CategoryCreate(name="  Food  ", color=" #abc ")
    assert obj.name == "Food"
    assert obj.color == "#abc"


def test_category_create_reject_missing_name():
    """Missing name raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        CategoryCreate(color="#fff")
    assert "name" in str(exc_info.value).lower() or any(
        e["loc"] == ("name",) for e in exc_info.value.errors()
    )


def test_category_create_reject_empty_name():
    """Empty name after strip raises ValidationError."""
    with pytest.raises(ValidationError):
        CategoryCreate(name="   ")


def test_category_create_reject_name_too_long():
    """Name longer than 100 chars raises ValidationError."""
    with pytest.raises(ValidationError):
        CategoryCreate(name="x" * 101)


def test_category_create_color_optional_omitted():
    """Color can be omitted (default None)."""
    obj = CategoryCreate(name="Food")
    assert obj.color is None


def test_category_create_reject_color_too_long():
    """Color longer than 20 chars raises ValidationError."""
    with pytest.raises(ValidationError):
        CategoryCreate(name="Food", color="x" * 21)


def test_category_create_reject_invalid_type_name():
    """Name as number raises ValidationError."""
    with pytest.raises(ValidationError):
        CategoryCreate(name=123)  # type: ignore[arg-type]


def test_category_create_reject_invalid_type_color():
    """Color as number raises ValidationError."""
    with pytest.raises(ValidationError):
        CategoryCreate(name="Food", color=456)  # type: ignore[arg-type]
