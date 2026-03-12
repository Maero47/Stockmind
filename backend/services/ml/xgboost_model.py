"""
XGBoost price-direction classifier — binary UP/DOWN.

Training labels:
  1 → UP   (next-day return > +0.5%)
  0 → DOWN (next-day return < -0.5%)
  Ambiguous ±0.5% rows are excluded from training.

Prediction signal:
  UP   — model says UP   with confidence ≥ HOLD_THRESHOLD
  DOWN — model says DOWN with confidence ≥ HOLD_THRESHOLD
  HOLD — model is uncertain (max confidence < HOLD_THRESHOLD)

Usage:
    result = predict(symbol)
    result = {
        "symbol": "AAPL",
        "signal": "UP",          # UP | HOLD | DOWN
        "confidence": 0.71,
        "probabilities": {"UP": 0.71, "DOWN": 0.29},
        "feature_importances": [{"feature": "rsi", "importance": 0.14}, ...],
        "training_accuracy": 0.62,
        "samples_trained": 480,
    }
"""

import time
from typing import Any

import numpy as np
import pandas as pd
import yfinance as yf
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split

from services.ml.feature_engineering import (
    build_feature_matrix,
    build_inference_row,
    FEATURE_COLUMNS,
)

# If model confidence < this threshold the signal is reported as HOLD
HOLD_THRESHOLD = 0.55

# ── In-memory model cache: symbol → (model, label_encoder, ts) ───────────────
_MODEL_CACHE: dict[str, tuple[XGBClassifier, LabelEncoder, float]] = {}
_MODEL_TTL = 3600  # retrain after 1 hour


# ── Data fetching ─────────────────────────────────────────────────────────────

def _fetch_ohlcv(symbol: str, period: str = "2y") -> pd.DataFrame:
    df = yf.download(symbol, period=period, interval="1d", progress=False, auto_adjust=True)
    if df.empty:
        raise ValueError(f"No data for {symbol}")

    # Flatten MultiIndex if present
    if hasattr(df.columns, "levels"):
        df.columns = df.columns.get_level_values(0)

    df.columns = [c.lower() for c in df.columns]
    df = df[["open", "high", "low", "close", "volume"]].copy()
    df.index = pd.to_datetime(df.index)
    return df


# ── Training ──────────────────────────────────────────────────────────────────

def _train(symbol: str) -> tuple[XGBClassifier, LabelEncoder, dict]:
    df = _fetch_ohlcv(symbol, period="2y")
    X, y = build_feature_matrix(df)

    if len(X) < 100:
        raise ValueError(f"Insufficient training data for {symbol} ({len(X)} samples).")

    # Binary labels: 1=UP, 0=DOWN (ambiguous ±0.5% rows already excluded)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, shuffle=False
    )

    model = XGBClassifier(
        n_estimators=300,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric="logloss",
        verbosity=0,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )

    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)

    meta = {
        "training_accuracy": round(float(acc), 4),
        "samples_trained": len(X_train),
        "samples_test": len(X_test),
    }
    return model, None, meta


def _get_model(symbol: str) -> tuple[XGBClassifier, dict]:
    """Returns cached model or trains a fresh one."""
    entry = _MODEL_CACHE.get(symbol.upper())
    if entry and time.time() < entry[2]:
        return entry[0], entry[3]

    model, _, meta = _train(symbol.upper())
    _MODEL_CACHE[symbol.upper()] = (model, None, time.time() + _MODEL_TTL, meta)
    return model, meta


# ── Prediction ────────────────────────────────────────────────────────────────

def predict(symbol: str) -> dict[str, Any]:
    """
    Full pipeline: fetch → train (or use cache) → predict latest bar.
    Returns a structured result dict.
    """
    symbol = symbol.upper()

    model, meta = _get_model(symbol)

    # Fetch recent data for inference
    df_recent = _fetch_ohlcv(symbol, period="3mo")
    X_live = build_inference_row(df_recent)

    # Predict — binary: index 1 = UP probability, index 0 = DOWN probability
    proba = model.predict_proba(X_live)[0]   # [P(DOWN), P(UP)]
    prob_up   = round(float(proba[1]), 4)
    prob_down = round(float(proba[0]), 4)
    confidence = max(prob_up, prob_down)

    if confidence < HOLD_THRESHOLD:
        signal = "HOLD"
    elif prob_up >= prob_down:
        signal = "UP"
    else:
        signal = "DOWN"

    # Feature importances (sorted desc)
    importances = sorted(
        [
            {"feature": feat, "importance": round(float(imp), 4)}
            for feat, imp in zip(FEATURE_COLUMNS, model.feature_importances_)
        ],
        key=lambda x: x["importance"],
        reverse=True,
    )

    return {
        "symbol": symbol,
        "signal": signal,
        "confidence": confidence,
        "probabilities": {"UP": prob_up, "DOWN": prob_down},
        "feature_importances": importances,
        "training_accuracy": meta["training_accuracy"],
        "samples_trained": meta["samples_trained"],
    }
