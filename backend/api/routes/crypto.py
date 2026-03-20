from fastapi import APIRouter
from fastapi.responses import RedirectResponse
from services.data.stock_fetcher import get_crypto_movers

router = APIRouter(prefix="/api/crypto", tags=["crypto"])


@router.get("/movers")
async def crypto_movers():
    return get_crypto_movers()


@router.get("/{symbol}")
async def get_crypto(symbol: str):
    # Crypto symbols (BTC-USD, ETH-USD, etc.) are fully supported by the stocks
    # endpoint via yfinance — redirect there instead of duplicating logic.
    return RedirectResponse(url=f"/api/stocks/{symbol.upper()}", status_code=307)
