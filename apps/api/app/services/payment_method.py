"""Payment method service: list, get, create, update, delete (Step 1: list only)."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import PaymentMethod


async def list_payment_methods(
    session: AsyncSession,
    *,
    active_only: bool = True,
) -> list[PaymentMethod]:
    """Return payment methods, optionally only active, ordered by name."""
    q = select(PaymentMethod).order_by(PaymentMethod.name.asc())
    if active_only:
        q = q.where(PaymentMethod.active.is_(True))
    result = await session.execute(q)
    return list(result.scalars().all())
