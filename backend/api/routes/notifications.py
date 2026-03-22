from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from db.database import get_db
from db import crud
from api.dependencies.auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


class NotificationSettingsResponse(BaseModel):
    quiet_hours_enabled: bool
    quiet_start: str | None
    quiet_end: str | None
    group_notifications: bool
    sound: str


class UpdateSettingsRequest(BaseModel):
    quiet_hours_enabled: bool | None = None
    quiet_start: str | None = None
    quiet_end: str | None = None
    group_notifications: bool | None = None
    sound: str | None = None


DEFAULTS = {
    "quiet_hours_enabled": False,
    "quiet_start": None,
    "quiet_end": None,
    "group_notifications": True,
    "sound": "default",
}


@router.get("/settings", response_model=NotificationSettingsResponse)
async def get_settings(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    settings = await crud.get_notification_settings(db, user["user_id"])
    if not settings:
        return DEFAULTS
    return {
        "quiet_hours_enabled": settings.quiet_hours_enabled,
        "quiet_start": settings.quiet_start,
        "quiet_end": settings.quiet_end,
        "group_notifications": settings.group_notifications,
        "sound": settings.sound,
    }


@router.put("/settings", response_model=NotificationSettingsResponse)
async def update_settings(
    body: UpdateSettingsRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    values = {k: v for k, v in body.model_dump().items() if v is not None}
    settings = await crud.upsert_notification_settings(db, user["user_id"], values)
    return {
        "quiet_hours_enabled": settings.quiet_hours_enabled,
        "quiet_start": settings.quiet_start,
        "quiet_end": settings.quiet_end,
        "group_notifications": settings.group_notifications,
        "sound": settings.sound,
    }
