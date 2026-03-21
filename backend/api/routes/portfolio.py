from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from db.database import get_db
from db import crud
from api.dependencies.auth import get_current_user

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


class PositionResponse(BaseModel):
    id: int
    symbol: str
    quantity: float
    avg_buy_price: float
    bought_at: str
    notes: str | None
    created_at: str
    updated_at: str


class CreatePositionRequest(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=20)
    quantity: float = Field(..., gt=0)
    avg_buy_price: float = Field(..., gt=0)
    bought_at: str
    notes: str | None = None


class UpdatePositionRequest(BaseModel):
    quantity: float | None = Field(None, gt=0)
    avg_buy_price: float | None = Field(None, gt=0)
    notes: str | None = None


def _serialize(p) -> dict:
    return {
        "id": p.id, "symbol": p.symbol,
        "quantity": p.quantity, "avg_buy_price": p.avg_buy_price,
        "bought_at": p.bought_at.isoformat() if isinstance(p.bought_at, datetime) else str(p.bought_at),
        "notes": p.notes,
        "created_at": p.created_at.isoformat(), "updated_at": p.updated_at.isoformat(),
    }


@router.get("", response_model=list[PositionResponse])
async def get_portfolio(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    positions = await crud.get_portfolio(db, user["user_id"])
    return [_serialize(p) for p in positions]


@router.post("", response_model=PositionResponse, status_code=201)
async def create_position(
    body: CreatePositionRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    bought_at = datetime.fromisoformat(body.bought_at)
    pos = await crud.upsert_position(
        db, user["user_id"], body.symbol,
        body.quantity, body.avg_buy_price, bought_at, body.notes,
    )
    return _serialize(pos)


@router.put("/{position_id}", response_model=PositionResponse)
async def update_position(
    position_id: int,
    body: UpdatePositionRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    pos = await crud.update_position(
        db, position_id, user["user_id"],
        body.quantity, body.avg_buy_price, body.notes,
    )
    if not pos:
        raise HTTPException(status_code=404, detail="Position not found")
    return _serialize(pos)


@router.delete("/{position_id}", status_code=204)
async def delete_position(
    position_id: int,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    deleted = await crud.delete_position(db, position_id, user["user_id"])
    if not deleted:
        raise HTTPException(status_code=404, detail="Position not found")
