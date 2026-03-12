from datetime import datetime
from sqlalchemy import String, Float, Integer, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from db.database import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    symbol: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    signal: Mapped[str] = mapped_column(String(10), nullable=False)          # UP / DOWN / HOLD
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    actual_direction: Mapped[str | None] = mapped_column(String(10), nullable=True)
    model_version: Mapped[str] = mapped_column(String(50), default="xgboost-v1", nullable=False)


class Search(Base):
    __tablename__ = "searches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    symbol: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    user_session: Mapped[str | None] = mapped_column(String(100), nullable=True)


class Cache(Base):
    __tablename__ = "cache"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    symbol: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    data_type: Mapped[str] = mapped_column(String(50), nullable=False)       # e.g. "quote", "history", "indicators"
    data_json: Mapped[str] = mapped_column(Text, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
