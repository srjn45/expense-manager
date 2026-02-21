"""Analytics API: monthly expense, etc."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db
from app.services.analytics import get_monthly_expense

router = APIRouter(prefix="/analytics", tags=["analytics"])

MAX_RANGE_DAYS = 366


@router.get(
    "/monthly-expense",
    status_code=status.HTTP_200_OK,
    responses={
        200: {"description": "Monthly expense and refund totals"},
        422: {
            "description": "Validation error (missing from/to, invalid format, from > to, range > 1 year)"
        },
    },
)
async def get_monthly_expense_route(
    session: AsyncSession = Depends(get_db),
    from_: date = Query(..., alias="from", description="Start date (YYYY-MM-DD)"),
    to: date = Query(..., description="End date (YYYY-MM-DD)"),
) -> dict:
    """Monthly expense and refund aggregates. Only non-deleted entries.
    totalExpense = sum(positive amounts), totalRefund = abs(sum(negative amounts)).
    """
    if from_ > to:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="from must be less than or equal to to",
        )
    if (to - from_).days > MAX_RANGE_DAYS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Date range must not exceed {MAX_RANGE_DAYS} days",
        )
    data = await get_monthly_expense(session, from_, to)
    return {"data": data}
