"""
Feature engineering: computes all technical indicators used by the ML model.
Input : pandas DataFrame with columns open, high, low, close, volume (lowercase).
Output: same DataFrame with indicator columns appended, plus a clean feature matrix.
"""

import numpy as np
import pandas as pd
import ta


def compute_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    Adds all technical indicator columns to df in-place and returns it.
    Expects: open, high, low, close, volume columns (lowercase).
    """
    close = df["close"]
    high  = df["high"]
    low   = df["low"]
    vol   = df["volume"]

    # ── RSI ──────────────────────────────────────────────────────────────────
    df["rsi"] = ta.momentum.RSIIndicator(close, window=14).rsi()

    # ── MACD ─────────────────────────────────────────────────────────────────
    macd = ta.trend.MACD(close)
    df["macd"]        = macd.macd()
    df["macd_signal"] = macd.macd_signal()
    df["macd_diff"]   = macd.macd_diff()          # histogram

    # ── Bollinger Bands ───────────────────────────────────────────────────────
    bb = ta.volatility.BollingerBands(close, window=20, window_dev=2)
    df["bb_upper"]  = bb.bollinger_hband()
    df["bb_lower"]  = bb.bollinger_lband()
    df["bb_middle"] = bb.bollinger_mavg()
    df["bb_pct"]    = bb.bollinger_pband()        # 0-1 position within bands

    # ── EMAs + cross signals ──────────────────────────────────────────────────
    df["ema_9"]  = ta.trend.EMAIndicator(close, window=9).ema_indicator()
    df["ema_21"] = ta.trend.EMAIndicator(close, window=21).ema_indicator()
    df["ema_50"] = ta.trend.EMAIndicator(close, window=50).ema_indicator()

    df["ema_9_21_cross"]  = (df["ema_9"]  > df["ema_21"]).astype(int)
    df["ema_21_50_cross"] = (df["ema_21"] > df["ema_50"]).astype(int)

    # ── Volume ratio ─────────────────────────────────────────────────────────
    df["vol_sma20"]    = vol.rolling(20).mean()
    df["vol_ratio"]    = vol / df["vol_sma20"]
    df["vol_ratio"]    = df["vol_ratio"].fillna(1.0)

    # ── Price momentum ────────────────────────────────────────────────────────
    df["return_1d"]  = close.pct_change(1)
    df["return_5d"]  = close.pct_change(5)
    df["return_20d"] = close.pct_change(20)

    # ── Volatility ────────────────────────────────────────────────────────────
    df["volatility_20d"] = df["return_1d"].rolling(20).std()

    # ── Support / Resistance (20-day rolling) ─────────────────────────────────
    df["support_20d"]    = low.rolling(20).min()
    df["resistance_20d"] = high.rolling(20).max()

    # ── ATR (Average True Range) ──────────────────────────────────────────────
    df["atr"] = ta.volatility.AverageTrueRange(high, low, close, window=14).average_true_range()

    # ── Stochastic Oscillator ─────────────────────────────────────────────────
    stoch = ta.momentum.StochasticOscillator(high, low, close)
    df["stoch_k"] = stoch.stoch()
    df["stoch_d"] = stoch.stoch_signal()

    return df


# Columns used as model features — order must stay consistent
FEATURE_COLUMNS = [
    "rsi",
    "macd", "macd_signal", "macd_diff",
    "bb_pct",
    "ema_9_21_cross", "ema_21_50_cross",
    "vol_ratio",
    "return_1d", "return_5d", "return_20d",
    "volatility_20d",
    "atr",
    "stoch_k", "stoch_d",
]


def build_feature_matrix(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series | None]:
    """
    Returns (X, y) where:
      X — feature DataFrame (NaN rows dropped)
      y — next-day direction label: 1=UP, 0=DOWN  (±0.5% threshold)
          None if we can't compute labels (live inference)
    """
    df = compute_indicators(df.copy())

    # Label: next-day close vs today's close — BINARY (UP=1 / DOWN=0)
    # Rows within the noise band are excluded from training (ambiguous signal).
    # HOLD is decided at inference time when model confidence is low.
    df["next_return"] = df["close"].pct_change(1).shift(-1)

    # Adaptive threshold: 25% of median absolute daily return (min 0.05%, max 0.5%)
    median_move = df["next_return"].abs().median()
    threshold = float(np.clip(median_move * 0.25, 0.0005, 0.005))

    df["label"] = np.where(df["next_return"] > threshold, 1, 0)

    # Drop ambiguous rows from training only
    df = df[np.abs(df["next_return"]) > threshold]
    df = df.dropna(subset=FEATURE_COLUMNS + ["label"])

    X = df[FEATURE_COLUMNS]
    y = df["label"]
    return X, y


def build_inference_row(df: pd.DataFrame) -> pd.DataFrame:
    """Returns a single-row feature DataFrame for the latest bar (live inference)."""
    df = compute_indicators(df.copy())
    df = df.dropna(subset=FEATURE_COLUMNS)
    if df.empty:
        raise ValueError("Not enough data to compute indicators.")
    return df[FEATURE_COLUMNS].iloc[[-1]]
