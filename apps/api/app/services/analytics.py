"""Analytics service: monthly expense, etc."""

from datetime import date
from decimal import Decimal

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import LedgerEntry


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
