import asyncio
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from enum import Enum
from sqlalchemy.ext.asyncio import AsyncSession
from db.database import get_db
from db import crud
from api.dependencies.auth import get_current_user
from services.email import send_alert_triggered

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


class AlertResponse(BaseModel):
    id: int
    symbol: str
    target_price: float
    direction: str
    triggered: bool
    created_at: str


class AlertDirection(str, Enum):
    above = "above"
    below = "below"

class CreateAlertRequest(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=20)
    target_price: float = Field(..., gt=0, lt=10_000_000)
    direction: AlertDirection


@router.get("", response_model=list[AlertResponse])
async def get_alerts(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    alerts = await crud.get_alerts(db, user["user_id"])
    return [
        {
            "id": a.id, "symbol": a.symbol,
            "target_price": a.target_price, "direction": a.direction,
            "triggered": a.triggered, "created_at": a.created_at.isoformat(),
        }
        for a in alerts
    ]


@router.post("", response_model=AlertResponse, status_code=201)
async def create_alert(
    body: CreateAlertRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    alert = await crud.create_alert(db, user["user_id"], body.symbol, body.target_price, body.direction.value)
    return {
        "id": alert.id, "symbol": alert.symbol,
        "target_price": alert.target_price, "direction": alert.direction,
        "triggered": alert.triggered, "created_at": alert.created_at.isoformat(),
    }


@router.delete("/{alert_id}", status_code=204)
async def delete_alert(
    alert_id: int,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    deleted = await crud.delete_alert(db, alert_id, user["user_id"])
    if not deleted:
        raise HTTPException(status_code=404, detail="Alert not found")


@router.post("/{alert_id}/trigger", status_code=200)
async def trigger_alert(
    alert_id: int,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    alerts = await crud.get_alerts(db, user["user_id"])
    alert = next((a for a in alerts if a.id == alert_id), None)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    ok = await crud.mark_alert_triggered(db, alert_id, user["user_id"])
    if not ok:
        raise HTTPException(status_code=404, detail="Alert not found")

    # Send email notification in background — don't block the response
    email = user.get("email")
    if email:
        asyncio.get_event_loop().run_in_executor(
            None,
            send_alert_triggered,
            email, alert.symbol, alert.direction, alert.target_price, alert.target_price,
        )

    return {"triggered": True}
