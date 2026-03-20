import asyncio
from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr
from api.dependencies.auth import get_current_user
from services.email import send_password_changed

router = APIRouter(prefix="/api/notify", tags=["notify"])


class EmailBody(BaseModel):
    email: EmailStr


@router.post("/password-changed", status_code=204)
async def notify_password_changed(
    body: EmailBody,
    user: dict = Depends(get_current_user),
):
    asyncio.get_event_loop().run_in_executor(
        None, send_password_changed, body.email
    )
