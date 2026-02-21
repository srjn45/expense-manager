"""Unit tests for analytics service: get_monthly_expense, get_expense_by_category."""

from datetime import UTC, date, datetime
from decimal import Decimal
from uuid import uuid4

import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Category, PaymentMethod
from app.services.analytics import (
    get_custom_expense_by_tags,
    get_dashboard,
    get_expense_by_category,
    get_expense_by_payment_method,
    get_monthly_expense,
)
from app.services.ledger_entry import create_ledger_entry


@pytest_asyncio.fixture
async def active_category(db_session: AsyncSession) -> Category:
    """One active category."""
    row = Category(
        id=uuid4(),
        name="Food",
        color="#ff0000",
        active=True,
    )
    db_session.add(row)
    await db_session.flush()
    return row


@pytest_asyncio.fixture
async def active_payment_method(db_session: AsyncSession) -> PaymentMethod:
    """One active payment method."""
    row = PaymentMethod(
        id=uuid4(),
        name="Card",
        currency="INR",
        active=True,
    )
    db_session.add(row)
    await db_session.flush()
    return row


async def test_get_monthly_expense_empty_range(
    db_session: AsyncSession,
):
    """get_monthly_expense with no entries returns one row per month with 0 totals."""
    result = await get_monthly_expense(
        db_session,
        from_date=date(2025, 1, 1),
        to_date=date(2025, 2, 28),
    )
    assert len(result) == 2
    assert result[0]["month"] == "2025-01"
    assert result[0]["totalExpense"] == 0.0
    assert result[0]["totalRefund"] == 0.0
    assert result[1]["month"] == "2025-02"
    assert result[1]["totalExpense"] == 0.0
    assert result[1]["totalRefund"] == 0.0


async def test_get_monthly_expense_aggregates_by_month(
    db_session: AsyncSession,
    active_category: Category,
    active_payment_method: PaymentMethod,
):
    """get_monthly_expense sums positive amounts as totalExpense, negative as totalRefund (abs)."""
    await create_ledger_entry(
        db_session,
        date_=date(2025, 1, 10),
        description="Expense",
        category_id=active_category.id,
        payment_method_id=active_payment_method.id,
        amount=Decimal("100"),
    )
    await create_ledger_entry(
        db_session,
        date_=date(2025, 1, 20),
        description="Refund",
        category_id=active_category.id,
        payment_method_id=active_payment_method.id,
        amount=Decimal("-30"),
    )
    await create_ledger_entry(
        db_session,
        date_=date(2025, 2, 5),
        description="Expense Feb",
        category_id=active_category.id,
        payment_method_id=active_payment_method.id,
        amount=Decimal("50"),
    )
    await db_session.flush()
    result = await get_monthly_expense(
        db_session,
        from_date=date(2025, 1, 1),
        to_date=date(2025, 2, 28),
    )
    assert len(result) == 2
    jan = next(r for r in result if r["month"] == "2025-01")
    feb = next(r for r in result if r["month"] == "2025-02")
    assert jan["totalExpense"] == 100.0
    assert jan["totalRefund"] == 30.0
    assert feb["totalExpense"] == 50.0
    assert feb["totalRefund"] == 0.0


async def test_get_monthly_expense_date_range_inclusive(
    db_session: AsyncSession,
    active_category: Category,
    active_payment_method: PaymentMethod,
):
    """get_monthly_expense includes from and to month (inclusive range)."""
    await create_ledger_entry(
        db_session,
        date_=date(2025, 3, 1),
        description="Only",
        category_id=active_category.id,
        payment_method_id=active_payment_method.id,
        amount=Decimal("10"),
    )
    await db_session.flush()
    result = await get_monthly_expense(
        db_session,
        from_date=date(2025, 3, 1),
        to_date=date(2025, 3, 31),
    )
    assert len(result) == 1
    assert result[0]["month"] == "2025-03"
    assert result[0]["totalExpense"] == 10.0


async def test_get_monthly_expense_excludes_soft_deleted(
    db_session: AsyncSession,
    active_category: Category,
    active_payment_method: PaymentMethod,
):
    """get_monthly_expense excludes entries with deleted_at set."""
    entry, _, _, _ = await create_ledger_entry(
        db_session,
        date_=date(2025, 1, 15),
        description="To delete",
        category_id=active_category.id,
        payment_method_id=active_payment_method.id,
        amount=Decimal("25"),
    )
    await db_session.flush()
    entry.deleted_at = datetime.now(UTC)
    await db_session.flush()
    result = await get_monthly_expense(
        db_session,
        from_date=date(2025, 1, 1),
        to_date=date(2025, 1, 31),
    )
    assert len(result) == 1
    assert result[0]["month"] == "2025-01"
    assert result[0]["totalExpense"] == 0.0
    assert result[0]["totalRefund"] == 0.0


# --- get_expense_by_category ---


@pytest_asyncio.fixture
async def second_category(db_session: AsyncSession) -> Category:
    """Second active category."""
    row = Category(
        id=uuid4(),
        name="Transport",
        color="#0000ff",
        active=True,
    )
    db_session.add(row)
    await db_session.flush()
    return row


async def test_get_expense_by_category_empty(
    db_session: AsyncSession,
):
    """get_expense_by_category with no entries returns empty list."""
    result = await get_expense_by_category(
        db_session, first_day_of_month=date(2025, 1, 1)
    )
    assert result == []


async def test_get_expense_by_category_groups_and_sum_positive_only(
    db_session: AsyncSession,
    active_category: Category,
    second_category: Category,
    active_payment_method: PaymentMethod,
):
    """get_expense_by_category groups by category; sums positive amounts only."""
    await create_ledger_entry(
        db_session,
        date_=date(2025, 1, 10),
        description="Food 1",
        category_id=active_category.id,
        payment_method_id=active_payment_method.id,
        amount=Decimal("50"),
    )
    await create_ledger_entry(
        db_session,
        date_=date(2025, 1, 20),
        description="Food 2",
        category_id=active_category.id,
        payment_method_id=active_payment_method.id,
        amount=Decimal("30"),
    )
    await create_ledger_entry(
        db_session,
        date_=date(2025, 1, 15),
        description="Transport",
        category_id=second_category.id,
        payment_method_id=active_payment_method.id,
        amount=Decimal("25"),
    )
    await create_ledger_entry(
        db_session,
        date_=date(2025, 1, 5),
        description="Refund (ignored)",
        category_id=active_category.id,
        payment_method_id=active_payment_method.id,
        amount=Decimal("-10"),
    )
    await db_session.flush()
    result = await get_expense_by_category(
        db_session, first_day_of_month=date(2025, 1, 1)
    )
    assert len(result) == 2
    by_name = {r["categoryName"]: r for r in result}
    assert by_name["Food"]["categoryId"] == str(active_category.id)
    assert by_name["Food"]["amount"] == 80.0
    assert by_name["Transport"]["categoryId"] == str(second_category.id)
    assert by_name["Transport"]["amount"] == 25.0


async def test_get_expense_by_category_excludes_soft_deleted(
    db_session: AsyncSession,
    active_category: Category,
    active_payment_method: PaymentMethod,
):
    """get_expense_by_category excludes entries with deleted_at set."""
    await create_ledger_entry(
        db_session,
        date_=date(2025, 1, 10),
        description="Kept",
        category_id=active_category.id,
        payment_method_id=active_payment_method.id,
        amount=Decimal("40"),
    )
    entry, _, _, _ = await create_ledger_entry(
        db_session,
        date_=date(2025, 1, 20),
        description="Deleted",
        category_id=active_category.id,
        payment_method_id=active_payment_method.id,
        amount=Decimal("60"),
    )
    await db_session.flush()
    entry.deleted_at = datetime.now(UTC)
    await db_session.flush()
    result = await get_expense_by_category(
        db_session, first_day_of_month=date(2025, 1, 1)
    )
    assert len(result) == 1
    assert result[0]["categoryName"] == "Food"
    assert result[0]["amount"] == 40.0


async def test_get_expense_by_category_only_in_month(
    db_session: AsyncSession,
    active_category: Category,
    active_payment_method: PaymentMethod,
):
    """get_expense_by_category only includes entries in the given month."""
    await create_ledger_entry(
        db_session,
        date_=date(2025, 2, 10),
        description="February",
        category_id=active_category.id,
        payment_method_id=active_payment_method.id,
        amount=Decimal("100"),
    )
    await db_session.flush()
    result_jan = await get_expense_by_category(
        db_session, first_day_of_month=date(2025, 1, 1)
    )
    result_feb = await get_expense_by_category(
        db_session, first_day_of_month=date(2025, 2, 1)
    )
    assert result_jan == []
    assert len(result_feb) == 1
    assert result_feb[0]["amount"] == 100.0


# --- get_expense_by_payment_method ---


@pytest_asyncio.fixture
async def second_payment_method(db_session: AsyncSession) -> PaymentMethod:
    """Second active payment method."""
    row = PaymentMethod(
        id=uuid4(),
        name="UPI",
        currency="INR",
        active=True,
    )
    db_session.add(row)
    await db_session.flush()
    return row


async def test_get_expense_by_payment_method_empty(db_session: AsyncSession):
    """get_expense_by_payment_method with no entries returns empty list."""
    result = await get_expense_by_payment_method(
        db_session, first_day_of_month=date(2025, 1, 1)
    )
    assert result == []


async def test_get_expense_by_payment_method_groups_and_sum_positive_only(
    db_session: AsyncSession,
    active_category: Category,
    active_payment_method: PaymentMethod,
    second_payment_method: PaymentMethod,
):
    """get_expense_by_payment_method groups by payment method; sums positive amounts only."""
    await create_ledger_entry(
        db_session,
        date_=date(2025, 1, 10),
        description="Card 1",
        category_id=active_category.id,
        payment_method_id=active_payment_method.id,
        amount=Decimal("50"),
    )
    await create_ledger_entry(
        db_session,
        date_=date(2025, 1, 20),
        description="Card 2",
        category_id=active_category.id,
        payment_method_id=active_payment_method.id,
        amount=Decimal("30"),
    )
    await create_ledger_entry(
        db_session,
        date_=date(2025, 1, 15),
        description="UPI",
        category_id=active_category.id,
        payment_method_id=second_payment_method.id,
        amount=Decimal("25"),
    )
    await create_ledger_entry(
        db_session,
        date_=date(2025, 1, 5),
        description="Refund (ignored)",
        category_id=active_category.id,
        payment_method_id=active_payment_method.id,
        amount=Decimal("-10"),
    )
    await db_session.flush()
    result = await get_expense_by_payment_method(
        db_session, first_day_of_month=date(2025, 1, 1)
    )
    assert len(result) == 2
    by_name = {r["paymentMethodName"]: r for r in result}
    assert by_name["Card"]["paymentMethodId"] == str(active_payment_method.id)
    assert by_name["Card"]["amount"] == 80.0
    assert by_name["UPI"]["paymentMethodId"] == str(second_payment_method.id)
    assert by_name["UPI"]["amount"] == 25.0


async def test_get_expense_by_payment_method_excludes_soft_deleted(
    db_session: AsyncSession,
    active_category: Category,
    active_payment_method: PaymentMethod,
):
    """get_expense_by_payment_method excludes entries with deleted_at set."""
    await create_ledger_entry(
        db_session,
        date_=date(2025, 1, 10),
        description="Kept",
        category_id=active_category.id,
        payment_method_id=active_payment_method.id,
        amount=Decimal("40"),
    )
    entry, _, _, _ = await create_ledger_entry(
        db_session,
        date_=date(2025, 1, 20),
        description="Deleted",
        category_id=active_category.id,
        payment_method_id=active_payment_method.id,
        amount=Decimal("60"),
    )
    await db_session.flush()
    entry.deleted_at = datetime.now(UTC)
    await db_session.flush()
    result = await get_expense_by_payment_method(
        db_session, first_day_of_month=date(2025, 1, 1)
    )
    assert len(result) == 1
    assert result[0]["paymentMethodName"] == "Card"
    assert result[0]["amount"] == 40.0


async def test_get_expense_by_payment_method_only_in_month(
    db_session: AsyncSession,
    active_category: Category,
    active_payment_method: PaymentMethod,
):
    """get_expense_by_payment_method only includes entries in the given month."""
    await create_ledger_entry(
        db_session,
        date_=date(2025, 2, 10),
        description="February",
        category_id=active_category.id,
        payment_method_id=active_payment_method.id,
        amount=Decimal("100"),
    )
    await db_session.flush()
    result_jan = await get_expense_by_payment_method(
        db_session, first_day_of_month=date(2025, 1, 1)
    )
    result_feb = await get_expense_by_payment_method(
        db_session, first_day_of_month=date(2025, 2, 1)
    )
    assert result_jan == []
    assert len(result_feb) == 1
    assert result_feb[0]["amount"] == 100.0


# --- get_custom_expense_by_tags ---


async def test_get_custom_expense_by_tags_empty_tags_returns_zero(
    db_session: AsyncSession,
):
    """get_custom_expense_by_tags with empty tag list returns 0."""
    result = await get_custom_expense_by_tags(
        db_session,
        tags=[],
        from_date=date(2025, 1, 1),
        to_date=date(2025, 12, 31),
    )
    assert result == 0.0


async def test_get_custom_expense_by_tags_no_matching_entries_returns_zero(
    db_session: AsyncSession,
    active_category: Category,
    active_payment_method: PaymentMethod,
):
    """get_custom_expense_by_tags with no entries matching tags returns 0."""
    await create_ledger_entry(
        db_session,
        date_=date(2025, 1, 15),
        description="Lunch",
        category_id=active_category.id,
        payment_method_id=active_payment_method.id,
        amount=Decimal("50"),
        tags=["food"],
    )
    await db_session.flush()
    result = await get_custom_expense_by_tags(
        db_session,
        tags=["travel"],
        from_date=date(2025, 1, 1),
        to_date=date(2025, 1, 31),
    )
    assert result == 0.0


async def test_get_custom_expense_by_tags_filters_by_tags_and(
    db_session: AsyncSession,
    active_category: Category,
    active_payment_method: PaymentMethod,
):
    """get_custom_expense_by_tags only includes entries that have ALL given tags (AND)."""
    await create_ledger_entry(
        db_session,
        date_=date(2025, 1, 10),
        description="A",
        category_id=active_category.id,
        payment_method_id=active_payment_method.id,
        amount=Decimal("100"),
        tags=["food", "lunch"],
    )
    await create_ledger_entry(
        db_session,
        date_=date(2025, 1, 20),
        description="B",
        category_id=active_category.id,
        payment_method_id=active_payment_method.id,
        amount=Decimal("50"),
        tags=["food"],
    )
    await db_session.flush()
    result_both = await get_custom_expense_by_tags(
        db_session,
        tags=["food", "lunch"],
        from_date=date(2025, 1, 1),
        to_date=date(2025, 1, 31),
    )
    result_one = await get_custom_expense_by_tags(
        db_session,
        tags=["food"],
        from_date=date(2025, 1, 1),
        to_date=date(2025, 1, 31),
    )
    assert result_both == 100.0
    assert result_one == 150.0


async def test_get_custom_expense_by_tags_date_range(
    db_session: AsyncSession,
    active_category: Category,
    active_payment_method: PaymentMethod,
):
    """get_custom_expense_by_tags only includes entries within from/to (inclusive)."""
    await create_ledger_entry(
        db_session,
        date_=date(2025, 1, 15),
        description="In range",
        category_id=active_category.id,
        payment_method_id=active_payment_method.id,
        amount=Decimal("30"),
        tags=["x"],
    )
    await create_ledger_entry(
        db_session,
        date_=date(2025, 2, 15),
        description="Feb",
        category_id=active_category.id,
        payment_method_id=active_payment_method.id,
        amount=Decimal("20"),
        tags=["x"],
    )
    await create_ledger_entry(
        db_session,
        date_=date(2025, 3, 15),
        description="March",
        category_id=active_category.id,
        payment_method_id=active_payment_method.id,
        amount=Decimal("10"),
        tags=["x"],
    )
    await db_session.flush()
    result = await get_custom_expense_by_tags(
        db_session,
        tags=["x"],
        from_date=date(2025, 2, 1),
        to_date=date(2025, 2, 28),
    )
    assert result == 20.0


async def test_get_custom_expense_by_tags_sum_positive_only(
    db_session: AsyncSession,
    active_category: Category,
    active_payment_method: PaymentMethod,
):
    """get_custom_expense_by_tags sums only positive amounts (expenses); negatives excluded."""
    await create_ledger_entry(
        db_session,
        date_=date(2025, 1, 10),
        description="Expense",
        category_id=active_category.id,
        payment_method_id=active_payment_method.id,
        amount=Decimal("80"),
        tags=["tag"],
    )
    await create_ledger_entry(
        db_session,
        date_=date(2025, 1, 20),
        description="Refund",
        category_id=active_category.id,
        payment_method_id=active_payment_method.id,
        amount=Decimal("-20"),
        tags=["tag"],
    )
    await db_session.flush()
    result = await get_custom_expense_by_tags(
        db_session,
        tags=["tag"],
        from_date=date(2025, 1, 1),
        to_date=date(2025, 1, 31),
    )
    assert result == 80.0


async def test_get_custom_expense_by_tags_excludes_soft_deleted(
    db_session: AsyncSession,
    active_category: Category,
    active_payment_method: PaymentMethod,
):
    """get_custom_expense_by_tags excludes entries with deleted_at set."""
    await create_ledger_entry(
        db_session,
        date_=date(2025, 1, 10),
        description="Kept",
        category_id=active_category.id,
        payment_method_id=active_payment_method.id,
        amount=Decimal("40"),
        tags=["a"],
    )
    entry, _, _, _ = await create_ledger_entry(
        db_session,
        date_=date(2025, 1, 20),
        description="Deleted",
        category_id=active_category.id,
        payment_method_id=active_payment_method.id,
        amount=Decimal("60"),
        tags=["a"],
    )
    await db_session.flush()
    entry.deleted_at = datetime.now(UTC)
    await db_session.flush()
    result = await get_custom_expense_by_tags(
        db_session,
        tags=["a"],
        from_date=date(2025, 1, 1),
        to_date=date(2025, 1, 31),
    )
    assert result == 40.0


# --- get_dashboard ---


async def test_get_dashboard_empty_range(
    db_session: AsyncSession,
):
    """get_dashboard with no entries returns zeros and empty last_entries."""
    result = await get_dashboard(
        db_session,
        from_date=date(2025, 1, 1),
        to_date=date(2025, 1, 31),
    )
    assert result["totalExpense"] == 0.0
    assert result["totalRefund"] == 0.0
    assert result["entryCount"] == 0
    assert result["last_entries"] == []


async def test_get_dashboard_computes_totals_and_count(
    db_session: AsyncSession,
    active_category: Category,
    active_payment_method: PaymentMethod,
):
    """get_dashboard sums totalExpense (positive), totalRefund (abs negative), entryCount."""
    await create_ledger_entry(
        db_session,
        date_=date(2025, 1, 10),
        description="Expense",
        category_id=active_category.id,
        payment_method_id=active_payment_method.id,
        amount=Decimal("100"),
    )
    await create_ledger_entry(
        db_session,
        date_=date(2025, 1, 20),
        description="Refund",
        category_id=active_category.id,
        payment_method_id=active_payment_method.id,
        amount=Decimal("-25"),
    )
    await db_session.flush()
    result = await get_dashboard(
        db_session,
        from_date=date(2025, 1, 1),
        to_date=date(2025, 1, 31),
    )
    assert result["totalExpense"] == 100.0
    assert result["totalRefund"] == 25.0
    assert result["entryCount"] == 2
    assert len(result["last_entries"]) == 2


async def test_get_dashboard_last_entries_ordered_date_desc(
    db_session: AsyncSession,
    active_category: Category,
    active_payment_method: PaymentMethod,
):
    """get_dashboard last_entries are most recent first (date desc, id desc)."""
    await create_ledger_entry(
        db_session,
        date_=date(2025, 1, 5),
        description="First",
        category_id=active_category.id,
        payment_method_id=active_payment_method.id,
        amount=Decimal("10"),
    )
    await create_ledger_entry(
        db_session,
        date_=date(2025, 1, 15),
        description="Second",
        category_id=active_category.id,
        payment_method_id=active_payment_method.id,
        amount=Decimal("20"),
    )
    await create_ledger_entry(
        db_session,
        date_=date(2025, 1, 25),
        description="Third",
        category_id=active_category.id,
        payment_method_id=active_payment_method.id,
        amount=Decimal("30"),
    )
    await db_session.flush()
    result = await get_dashboard(
        db_session,
        from_date=date(2025, 1, 1),
        to_date=date(2025, 1, 31),
        last_n=5,
    )
    assert len(result["last_entries"]) == 3
    entries = result["last_entries"]
    assert entries[0][0].description == "Third"
    assert entries[1][0].description == "Second"
    assert entries[2][0].description == "First"


async def test_get_dashboard_last_entries_limit(
    db_session: AsyncSession,
    active_category: Category,
    active_payment_method: PaymentMethod,
):
    """get_dashboard returns at most last_n entries (default 5)."""
    for i in range(7):
        await create_ledger_entry(
            db_session,
            date_=date(2025, 1, 10 + i),
            description=f"Entry {i}",
            category_id=active_category.id,
            payment_method_id=active_payment_method.id,
            amount=Decimal("1"),
        )
    await db_session.flush()
    result = await get_dashboard(
        db_session,
        from_date=date(2025, 1, 1),
        to_date=date(2025, 1, 31),
        last_n=5,
    )
    assert result["entryCount"] == 7
    assert len(result["last_entries"]) == 5


async def test_get_dashboard_excludes_soft_deleted(
    db_session: AsyncSession,
    active_category: Category,
    active_payment_method: PaymentMethod,
):
    """get_dashboard excludes entries with deleted_at set from totals, count, last_entries."""
    await create_ledger_entry(
        db_session,
        date_=date(2025, 1, 10),
        description="Kept",
        category_id=active_category.id,
        payment_method_id=active_payment_method.id,
        amount=Decimal("50"),
    )
    entry, _, _, _ = await create_ledger_entry(
        db_session,
        date_=date(2025, 1, 20),
        description="Deleted",
        category_id=active_category.id,
        payment_method_id=active_payment_method.id,
        amount=Decimal("25"),
    )
    await db_session.flush()
    entry.deleted_at = datetime.now(UTC)
    await db_session.flush()
    result = await get_dashboard(
        db_session,
        from_date=date(2025, 1, 1),
        to_date=date(2025, 1, 31),
    )
    assert result["totalExpense"] == 50.0
    assert result["entryCount"] == 1
    assert len(result["last_entries"]) == 1
    assert result["last_entries"][0][0].description == "Kept"
