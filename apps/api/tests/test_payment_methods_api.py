"""Integration tests for GET /api/v1/payment-methods."""

import uuid
from datetime import datetime

import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import PaymentMethod


@pytest_asyncio.fixture
async def one_active_payment_method(db_session: AsyncSession) -> PaymentMethod:
    """Insert one active payment method for tests that need data."""
    row = PaymentMethod(
        id=uuid.uuid4(),
        name="Cash",
        currency="INR",
        active=True,
    )
    db_session.add(row)
    await db_session.flush()
    return row


@pytest_asyncio.fixture
async def one_inactive_payment_method(db_session: AsyncSession) -> PaymentMethod:
    """Insert one inactive payment method."""
    row = PaymentMethod(
        id=uuid.uuid4(),
        name="OldCard",
        currency="USD",
        active=False,
    )
    db_session.add(row)
    await db_session.flush()
    return row


async def test_get_payment_methods_empty_returns_200_and_empty_data(client: AsyncClient):
    """GET /api/v1/payment-methods with no data returns 200 and data: []."""
    response = await client.get("/api/v1/payment-methods")
    assert response.status_code == 200
    body = response.json()
    assert "data" in body
    assert body["data"] == []


async def test_get_payment_methods_returns_active_only_with_correct_shape(
    client: AsyncClient,
    one_active_payment_method: PaymentMethod,
    one_inactive_payment_method: PaymentMethod,
):
    """GET returns only active payment methods with id, name, currency, active, createdAt."""
    response = await client.get("/api/v1/payment-methods")
    assert response.status_code == 200
    body = response.json()
    assert "data" in body
    assert len(body["data"]) == 1
    item = body["data"][0]
    assert item["id"] == str(one_active_payment_method.id)
    assert item["name"] == one_active_payment_method.name
    assert item["currency"] == one_active_payment_method.currency
    assert item["active"] is True
    assert "createdAt" in item
    # Inactive record must not appear
    ids = [x["id"] for x in body["data"]]
    assert str(one_inactive_payment_method.id) not in ids


async def test_get_payment_methods_created_at_is_iso8601(
    client: AsyncClient,
    one_active_payment_method: PaymentMethod,
):
    """GET response createdAt is ISO 8601 format (date and time with T separator)."""
    response = await client.get("/api/v1/payment-methods")
    assert response.status_code == 200
    item = response.json()["data"][0]
    created_at = item["createdAt"]
    assert "T" in created_at
    # Parseable as ISO 8601 (naive or with Z/offset)
    datetime.fromisoformat(created_at.replace("Z", "+00:00"))
