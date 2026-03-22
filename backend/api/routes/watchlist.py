import re
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from db.database import get_db
from db import crud
from api.dependencies.auth import get_current_user

router = APIRouter(prefix="/api/watchlist", tags=["watchlist"])


class WatchlistItemResponse(BaseModel):
    symbol: str
    added_at: str


class AddSymbolRequest(BaseModel):
    symbol: str


class ReorderRequest(BaseModel):
    symbols: list[str]


@router.get("", response_model=list[WatchlistItemResponse])
async def get_watchlist(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items = await crud.get_watchlist(db, user["user_id"])
    return [{"symbol": i.symbol, "added_at": i.added_at.isoformat()} for i in items]


@router.post("", status_code=201)
async def add_to_watchlist(
    body: AddSymbolRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await crud.add_to_watchlist(db, user["user_id"], body.symbol)
    return {"symbol": body.symbol.upper()}


@router.put("/reorder", status_code=200)
async def reorder_watchlist(
    body: ReorderRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await crud.reorder_watchlist(db, user["user_id"], body.symbols)
    return {"ok": True}


@router.delete("/{symbol}", status_code=204)
async def remove_from_watchlist(
    symbol: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not re.match(r"^[A-Za-z0-9.\-]{1,20}$", symbol):
        raise HTTPException(status_code=400, detail="Invalid symbol")
    await crud.remove_from_watchlist(db, user["user_id"], symbol)
