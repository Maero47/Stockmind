"""
XGBoost price-direction classifier — binary UP/DOWN with calibrated probabilities.

Training labels:
  1 → UP   (next-day return above adaptive threshold)
  0 → DOWN (next-day return below adaptive threshold)

Prediction signal:
  UP   — calibrated P(UP)   ≥ HOLD_THRESHOLD
  DOWN — calibrated P(DOWN) ≥ HOLD_THRESHOLD
  HOLD — model is uncertain (max confidence < HOLD_THRESHOLD)

Usage:
    result = predict(symbol)
    result = {
        "symbol": "AAPL",
        "signal": "UP",
        "confidence": 0.62,
        "probabilities": {"UP": 0.62, "DOWN": 0.38},
        "feature_importances": [{"feature": "rsi", "importance": 0.14}, ...],
        "training_accuracy": 0.58,
        "samples_trained": 380,
    }
"""

import time
from typing import Any

import numpy as np
import pandas as pd
import yfinance as yf
from xgboost import XGBClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import accuracy_score
from sklearn.model_selection import TimeSeriesSplit

from services.ml.feature_engineering import (
    build_feature_matrix,
    build_inference_row,
    FEATURE_COLUMNS,
)

HOLD_THRESHOLD = 0.55

# ── In-memory model cache: symbol → (calibrated_model, meta, expires_at) ─────
_MODEL_CACHE: dict[str, tuple] = {}
_MODEL_TTL = 3600


# ── Data fetching ─────────────────────────────────────────────────────────────

def _fetch_ohlcv(symbol: str, period: str = "2y") -> pd.DataFrame:
    df = yf.download(symbol, period=period, interval="1d", progress=False, auto_adjust=True)
    if df.empty:
        raise ValueError(f"No data for {symbol}")

    if hasattr(df.columns, "levels"):
        df.columns = df.columns.get_level_values(0)

    df.columns = [c.lower() for c in df.columns]
    df = df[["open", "high", "low", "close", "volume"]].copy()
    df.index = pd.to_datetime(df.index)
    return df


# ── Training ──────────────────────────────────────────────────────────────────

def _train(symbol: str) -> tuple:
    df = _fetch_ohlcv(symbol, period="2y")
    X, y = build_feature_matrix(df)

    if len(X) < 100:
        raise ValueError(f"Insufficient training data for {symbol} ({len(X)} samples).")

    # Time-series split: last 20% for final evaluation
    split_idx = int(len(X) * 0.8)
    X_train_full, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train_full, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

    # Find optimal n_estimators via early stopping on validation set
    finder = XGBClassifier(
        n_estimators=500,
        max_depth=3,
        learning_rate=0.03,
        subsample=0.7,
        colsample_bytree=0.7,
        reg_alpha=1.0,
        reg_lambda=2.0,
        min_child_weight=5,
        eval_metric="logloss",
        early_stopping_rounds=30,
        verbosity=0,
        random_state=42,
        n_jobs=-1,
    )
    finder.fit(
        X_train_full, y_train_full,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )
    best_rounds = finder.best_iteration + 1

    # Re-create base model with the optimal number of trees (no early stopping)
    base_model = XGBClassifier(
        n_estimators=best_rounds,
        max_depth=3,
        learning_rate=0.03,
        subsample=0.7,
        colsample_bytree=0.7,
        reg_alpha=1.0,
        reg_lambda=2.0,
        min_child_weight=5,
        eval_metric="logloss",
        verbosity=0,
        random_state=42,
        n_jobs=-1,
    )

    # Fit base model on full training data for feature importances
    base_model.fit(X_train_full, y_train_full)

    # Calibrate probabilities using time-series CV on training data
    cal_model = CalibratedClassifierCV(
        estimator=base_model,
        method="isotonic",
        cv=TimeSeriesSplit(n_splits=3),
    )
    cal_model.fit(X_train_full, y_train_full)

    y_pred = cal_model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)

    meta = {
        "training_accuracy": round(float(acc), 4),
        "samples_trained": len(X_train_full),
        "samples_test": len(X_test),
    }
    return cal_model, base_model, meta


def _get_model(symbol: str) -> tuple:
    """Returns cached model or trains a fresh one."""
    entry = _MODEL_CACHE.get(symbol.upper())
    if entry and time.time() < entry[3]:
        return entry[0], entry[1], entry[2]

    cal_model, base_model, meta = _train(symbol.upper())
    _MODEL_CACHE[symbol.upper()] = (cal_model, base_model, meta, time.time() + _MODEL_TTL)
    return cal_model, base_model, meta


# ── Prediction ────────────────────────────────────────────────────────────────

def predict(symbol: str) -> dict[str, Any]:
    """
    Full pipeline: fetch -> train (or use cache) -> predict latest bar.
    Returns a structured result dict with calibrated probabilities.
    """
    symbol = symbol.upper()

    cal_model, base_model, meta = _get_model(symbol)

    df_recent = _fetch_ohlcv(symbol, period="3mo")
    X_live = build_inference_row(df_recent)

    proba = cal_model.predict_proba(X_live)[0]
    prob_up   = round(float(proba[1]), 4)
    prob_down = round(float(proba[0]), 4)
    confidence = max(prob_up, prob_down)

    if confidence < HOLD_THRESHOLD:
        signal = "HOLD"
    elif prob_up >= prob_down:
        signal = "UP"
    else:
        signal = "DOWN"

    # Feature importances from the base XGBoost model
    importances = sorted(
        [
            {"feature": feat, "importance": round(float(imp), 4)}
            for feat, imp in zip(FEATURE_COLUMNS, base_model.feature_importances_)
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
