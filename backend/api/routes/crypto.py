from fastapi import APIRouter

router = APIRouter(prefix="/api/crypto", tags=["crypto"])


@router.get("/{symbol}")
async def get_crypto(symbol: str):
    """Crypto data via ccxt — implemented in Step 3."""
    return {"symbol": symbol.upper(), "message": "crypto endpoint — coming in Step 3"}
