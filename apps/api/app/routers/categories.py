"""Categories API: GET list, POST (GET one, PUT, DELETE in later steps)."""

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db
from app.schemas.category import CategoryCreate, CategoryResponse
from app.services.category import create_category, list_categories

router = APIRouter(prefix="/categories", tags=["categories"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=dict,
    responses={
        201: {"description": "Category created"},
        422: {"description": "Validation error"},
    },
)
async def post_category(
    body: CategoryCreate,
    session: AsyncSession = Depends(get_db),
) -> JSONResponse:
    """Create a category."""
    row = await create_category(
        session,
        name=body.name,
        color=body.color,
    )
    payload = CategoryResponse.model_validate(row).model_dump(
        mode="json", by_alias=True
    )
    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content={"data": payload},
        headers={"Location": f"/api/v1/categories/{row.id}"},
    )


@router.get(
    "",
    response_model=dict,
    responses={200: {"description": "List of active categories"}},
)
async def get_categories(
    session: AsyncSession = Depends(get_db),
) -> dict:
    """List active categories (for dropdowns)."""
    items = await list_categories(session, active_only=True)
    return {
        "data": [
            CategoryResponse.model_validate(c).model_dump(mode="json", by_alias=True)
            for c in items
        ]
    }
