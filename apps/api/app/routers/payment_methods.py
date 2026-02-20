"""Payment methods API: GET list, GET one, POST, PUT, DELETE (Step 1: list only)."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db
from app.schemas.payment_method import PaymentMethodResponse
from app.services.payment_method import list_payment_methods

router = APIRouter(prefix="/payment-methods", tags=["payment-methods"])


@router.get(
    "",
    response_model=dict,
    responses={200: {"description": "List of active payment methods"}},
)
async def get_payment_methods(
    session: AsyncSession = Depends(get_db),
) -> dict:
    """List active payment methods (for dropdowns)."""
    items = await list_payment_methods(session, active_only=True)
    return {
        "data": [
            PaymentMethodResponse.model_validate(m).model_dump(mode="json", by_alias=True)
            for m in items
        ]
    }
