import re
from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from services.data.stock_fetcher import get_crypto_movers

router = APIRouter(prefix="/api/crypto", tags=["crypto"])


@router.get("/movers")
async def crypto_movers():
    return get_crypto_movers()


@router.get("/{symbol}")
async def get_crypto(symbol: str):
    if not re.match(r"^[A-Za-z0-9.\-]{1,20}$", symbol):
        raise HTTPException(status_code=400, detail="Invalid symbol")
    return RedirectResponse(url=f"/api/stocks/{symbol.upper()}", status_code=307)
