"""Analytics service: monthly expense, expense by category, dashboard, etc."""

import calendar
from datetime import date
from decimal import Decimal
from typing import Any

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Category, LedgerEntry, PaymentMethod
from app.services.ledger_entry import list_ledger_entries

DASHBOARD_LAST_ENTRIES_LIMIT = 5


async def get_totals_by_currency(
    session: AsyncSession,
    from_date: date,
    to_date: date,
) -> list[dict[str, str | float]]:
    """Expense and refund totals per currency in date range.
    Join LedgerEntry with PaymentMethod; group by currency.
    Only non-deleted entries. Returns list of { currency, totalExpense, totalRefund }.
    """
    total_expense = func.coalesce(
        func.sum(case((LedgerEntry.amount > 0, LedgerEntry.amount), else_=0)), 0
    ).label("total_expense")
    total_refund = func.coalesce(
        func.sum(case((LedgerEntry.amount < 0, -LedgerEntry.amount), else_=0)), 0
    ).label("total_refund")

    q = (
        select(
            PaymentMethod.currency,
            total_expense,
            total_refund,
        )
        .select_from(LedgerEntry)
        .join(PaymentMethod, LedgerEntry.payment_method_id == PaymentMethod.id)
        .where(
            LedgerEntry.deleted_at.is_(None),
            LedgerEntry.date >= from_date,
            LedgerEntry.date <= to_date,
        )
        .group_by(PaymentMethod.currency)
        .order_by(PaymentMethod.currency)
    )
    result = await session.execute(q)
    return [
        {
            "currency": row[0],
            "totalExpense": float(row[1]) if row[1] is not None else 0.0,
            "totalRefund": float(row[2]) if row[2] is not None else 0.0,
        }
        for row in result.all()
    ]


async def get_years_with_data(session: AsyncSession) -> list[int]:
    """Distinct years for which at least one non-deleted ledger entry exists, ordered desc."""
    year_col = func.extract("year", LedgerEntry.date).label("year")
    q = (
        select(year_col)
        .select_from(LedgerEntry)
        .where(LedgerEntry.deleted_at.is_(None))
        .distinct()
        .order_by(year_col.desc())
    )
    result = await session.execute(q)
    return [int(row[0]) for row in result.all()]


async def get_dashboard(
    session: AsyncSession,
    from_date: date,
    to_date: date,
    last_n: int = DASHBOARD_LAST_ENTRIES_LIMIT,
) -> dict[str, Any]:
    """Composite dashboard: per-currency totals, entryCount, last N entries.
    Only non-deleted entries in date range. lastEntries ordered by date desc, id desc.
    """
    entry_count = func.count(LedgerEntry.id).label("entry_count")
    q = (
        select(entry_count)
        .select_from(LedgerEntry)
        .where(
            LedgerEntry.deleted_at.is_(None),
            LedgerEntry.date >= from_date,
            LedgerEntry.date <= to_date,
        )
    )
    result = await session.execute(q)
    row = result.one()
    entry_count_val = int(row[0]) if row[0] is not None else 0

    totals_by_currency = await get_totals_by_currency(session, from_date, to_date)
    total_expense_by_currency = [
        {"currency": r["currency"], "totalExpense": r["totalExpense"]}
        for r in totals_by_currency
    ]
    total_refund_by_currency = [
        {"currency": r["currency"], "totalRefund": r["totalRefund"]}
        for r in totals_by_currency
    ]

    last_rows, _ = await list_ledger_entries(
        session,
        cursor=None,
        limit=last_n,
        date_from=from_date,
        date_to=to_date,
    )

    return {
        "totalExpenseByCurrency": total_expense_by_currency,
        "totalRefundByCurrency": total_refund_by_currency,
        "entryCount": entry_count_val,
        "last_entries": last_rows,
    }


async def get_custom_expense_by_tags(
    session: AsyncSession,
    tags: list[str],
    from_date: date,
    to_date: date,
) -> float:
    """Sum of positive amounts for entries that have all given tags in date range.
    Excludes soft-deleted entries. Returns totalExpense (0 if no matches).
    """
    if not tags:
        return 0.0
    total = func.coalesce(func.sum(LedgerEntry.amount), 0).label("total_expense")
    q = (
        select(total)
        .select_from(LedgerEntry)
        .where(
            LedgerEntry.deleted_at.is_(None),
            LedgerEntry.date >= from_date,
            LedgerEntry.date <= to_date,
            LedgerEntry.amount > 0,
            LedgerEntry.tags.contains(tags),
        )
    )
    result = await session.execute(q)
    row = result.one()
    value = row[0]
    if value is None:
        return 0.0
    return float(value)


async def get_monthly_expense(
    session: AsyncSession,
    from_date: date,
    to_date: date,
) -> list[dict[str, str | float]]:
    """Aggregate ledger entries by month (YYYY-MM) in the given range (inclusive).
    Only non-deleted entries. totalExpense = sum(amount where amount > 0),
    totalRefund = abs(sum(amount where amount < 0)). Returns one row per month in range,
    with 0 for months that have no entries.
    """
    month_start = func.date_trunc("month", LedgerEntry.date).label("month_start")
    total_expense = func.coalesce(
        func.sum(case((LedgerEntry.amount > 0, LedgerEntry.amount), else_=0)), 0
    ).label("total_expense")
    total_refund = func.coalesce(
        func.sum(case((LedgerEntry.amount < 0, -LedgerEntry.amount), else_=0)), 0
    ).label("total_refund")

    q = (
        select(month_start, total_expense, total_refund)
        .select_from(LedgerEntry)
        .where(
            LedgerEntry.deleted_at.is_(None),
            LedgerEntry.date >= from_date,
            LedgerEntry.date <= to_date,
        )
        .group_by(month_start)
        .order_by(month_start)
    )
    result = await session.execute(q)
    rows = result.all()

    by_month: dict[str, tuple[Decimal, Decimal]] = {}
    for row in rows:
        # month_start is timestamp; format as YYYY-MM
        ts = row[0]
        if hasattr(ts, "strftime"):
            month_str = ts.strftime("%Y-%m")
        else:
            month_str = f"{ts.year:04d}-{ts.month:02d}"
        by_month[month_str] = (row[1], row[2])

    out: list[dict[str, str | float]] = []
    y, m = from_date.year, from_date.month
    end_y, end_m = to_date.year, to_date.month
    while (y, m) <= (end_y, end_m):
        month_str = f"{y:04d}-{m:02d}"
        te, tr = by_month.get(month_str, (Decimal("0"), Decimal("0")))
        out.append(
            {
                "month": month_str,
                "totalExpense": float(te),
                "totalRefund": float(tr),
            }
        )
        m += 1
        if m > 12:
            m = 1
            y += 1
    return out


async def get_expense_by_category(
    session: AsyncSession,
    first_day_of_month: date,
) -> list[dict[str, str | float]]:
    """Expense totals by category for the given month (positive amounts only).
    Excludes soft-deleted entries. Returns list of categoryId, categoryName, amount.
    """
    _, last_day = calendar.monthrange(first_day_of_month.year, first_day_of_month.month)
    last_day_of_month = first_day_of_month.replace(day=last_day)

    total = func.coalesce(func.sum(LedgerEntry.amount), Decimal("0")).label("amount")

    q = (
        select(
            LedgerEntry.category_id,
            Category.name.label("category_name"),
            total,
        )
        .select_from(LedgerEntry)
        .join(Category, LedgerEntry.category_id == Category.id)
        .where(
            LedgerEntry.deleted_at.is_(None),
            LedgerEntry.date >= first_day_of_month,
            LedgerEntry.date <= last_day_of_month,
            LedgerEntry.amount > 0,
        )
        .group_by(LedgerEntry.category_id, Category.name)
        .order_by(total.desc())
    )
    result = await session.execute(q)
    return [
        {
            "categoryId": str(row[0]),
            "categoryName": row[1],
            "amount": float(row[2]),
        }
        for row in result.all()
    ]


async def get_expense_by_payment_method(
    session: AsyncSession,
    first_day_of_month: date,
) -> list[dict[str, str | float]]:
    """Expense totals by payment method for the given month (positive amounts only).
    Excludes soft-deleted entries. Returns list of paymentMethodId, paymentMethodName, amount.
    """
    _, last_day = calendar.monthrange(first_day_of_month.year, first_day_of_month.month)
    last_day_of_month = first_day_of_month.replace(day=last_day)

    total = func.coalesce(func.sum(LedgerEntry.amount), Decimal("0")).label("amount")

    q = (
        select(
            LedgerEntry.payment_method_id,
            PaymentMethod.name.label("payment_method_name"),
            total,
        )
        .select_from(LedgerEntry)
        .join(PaymentMethod, LedgerEntry.payment_method_id == PaymentMethod.id)
        .where(
            LedgerEntry.deleted_at.is_(None),
            LedgerEntry.date >= first_day_of_month,
            LedgerEntry.date <= last_day_of_month,
            LedgerEntry.amount > 0,
        )
        .group_by(LedgerEntry.payment_method_id, PaymentMethod.name)
        .order_by(total.desc())
    )
    result = await session.execute(q)
    return [
        {
            "paymentMethodId": str(row[0]),
            "paymentMethodName": row[1],
            "amount": float(row[2]),
        }
        for row in result.all()
    ]
