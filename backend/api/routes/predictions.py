from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db import crud
from services.ml.xgboost_model import predict as ml_predict
from api.dependencies.auth import get_current_user

router = APIRouter(prefix="/api/predict", tags=["predictions"])


# ── Response Models ───────────────────────────────────────────────────────────

class FeatureImportance(BaseModel):
    feature: str
    importance: float


class PredictionResponse(BaseModel):
    symbol: str
    signal: str                          # UP | HOLD | DOWN
    confidence: float
    probabilities: dict[str, float]
    feature_importances: list[FeatureImportance]
    training_accuracy: float
    samples_trained: int


# ── Route ─────────────────────────────────────────────────────────────────────

@router.post("/{symbol}", response_model=PredictionResponse)
async def predict_symbol(
    symbol: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """
    Train (or use cached) XGBoost model on 2 years of daily data for {symbol},
    then predict next-day price direction.
    """
    symbol = symbol.upper()
    try:
        result = ml_predict(symbol)
    except ValueError:
        raise HTTPException(status_code=404, detail="Prediction not available")
    except Exception:
        raise HTTPException(status_code=500, detail="Prediction failed. Please try again.")

    # Persist prediction to DB
    await crud.save_prediction(
        db,
        symbol=symbol,
        signal=result["signal"],
        confidence=result["confidence"],
    )

    return PredictionResponse(
        symbol=result["symbol"],
        signal=result["signal"],
        confidence=result["confidence"],
        probabilities=result["probabilities"],
        feature_importances=[FeatureImportance(**fi) for fi in result["feature_importances"]],
        training_accuracy=result["training_accuracy"],
        samples_trained=result["samples_trained"],
    )
