"""Unit tests for payment method service: list_payment_methods."""

import uuid

import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import PaymentMethod
from app.services.payment_method import list_payment_methods


@pytest_asyncio.fixture
async def payment_method_active(db_session: AsyncSession) -> PaymentMethod:
    """One active payment method."""
    row = PaymentMethod(
        id=uuid.uuid4(),
        name="Card",
        currency="INR",
        active=True,
    )
    db_session.add(row)
    await db_session.flush()
    return row


@pytest_asyncio.fixture
async def payment_method_inactive(db_session: AsyncSession) -> PaymentMethod:
    """One inactive payment method."""
    row = PaymentMethod(
        id=uuid.uuid4(),
        name="OldWallet",
        currency="INR",
        active=False,
    )
    db_session.add(row)
    await db_session.flush()
    return row


async def test_list_payment_methods_returns_only_active(
    db_session: AsyncSession,
    payment_method_active: PaymentMethod,
    payment_method_inactive: PaymentMethod,
):
    """list_payment_methods(active_only=True) excludes inactive records."""
    result = await list_payment_methods(db_session, active_only=True)
    ids = [r.id for r in result]
    assert payment_method_active.id in ids
    assert payment_method_inactive.id not in ids
    assert len(result) == 1


async def test_list_payment_methods_empty_returns_empty_list(db_session: AsyncSession):
    """list_payment_methods with no rows returns empty list."""
    result = await list_payment_methods(db_session, active_only=True)
    assert result == []


async def test_list_payment_methods_ordered_by_name(db_session: AsyncSession):
    """list_payment_methods returns rows ordered by name ascending."""
    for name in ["Zebra", "Alpha", "Mono"]:
        db_session.add(
            PaymentMethod(id=uuid.uuid4(), name=name, currency="INR", active=True)
        )
    await db_session.flush()
    result = await list_payment_methods(db_session, active_only=True)
    assert [r.name for r in result] == ["Alpha", "Mono", "Zebra"]


async def test_list_payment_methods_active_only_false_includes_inactive(
    db_session: AsyncSession,
    payment_method_active: PaymentMethod,
    payment_method_inactive: PaymentMethod,
):
    """list_payment_methods(active_only=False) includes inactive records."""
    result = await list_payment_methods(db_session, active_only=False)
    ids = [r.id for r in result]
    assert payment_method_active.id in ids
    assert payment_method_inactive.id in ids
    assert len(result) == 2
