from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, constr
from sqlalchemy.ext.asyncio import AsyncSession
from db.database import get_db
from db import crud
from api.dependencies.auth import get_current_user

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ConversationResponse(BaseModel):
    id: int
    symbol: str | None
    title: str | None
    created_at: str
    updated_at: str


class CreateConversationRequest(BaseModel):
    symbol: constr(max_length=20) | None = None  # type: ignore[valid-type]
    title: constr(max_length=200) | None = None  # type: ignore[valid-type]


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    role: str
    content: str
    created_at: str


class AddMessageRequest(BaseModel):
    role: Literal["user", "assistant"]
    content: constr(max_length=50000)  # type: ignore[valid-type]


@router.get("/conversations", response_model=list[ConversationResponse])
async def list_conversations(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    convs = await crud.get_conversations(db, user["user_id"])
    return [
        {
            "id": c.id, "symbol": c.symbol, "title": c.title,
            "created_at": c.created_at.isoformat(),
            "updated_at": c.updated_at.isoformat(),
        }
        for c in convs
    ]


@router.post("/conversations", response_model=ConversationResponse, status_code=201)
async def create_conversation(
    body: CreateConversationRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conv = await crud.create_conversation(db, user["user_id"], body.symbol, body.title)
    return {
        "id": conv.id, "symbol": conv.symbol, "title": conv.title,
        "created_at": conv.created_at.isoformat(),
        "updated_at": conv.updated_at.isoformat(),
    }


@router.get("/conversations/{conv_id}/messages", response_model=list[MessageResponse])
async def get_messages(
    conv_id: int,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    msgs = await crud.get_conversation_messages(db, conv_id, user["user_id"])
    return [
        {
            "id": m.id, "conversation_id": m.conversation_id,
            "role": m.role, "content": m.content,
            "created_at": m.created_at.isoformat(),
        }
        for m in msgs
    ]


@router.post("/conversations/{conv_id}/messages", response_model=MessageResponse, status_code=201)
async def add_message(
    conv_id: int,
    body: AddMessageRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    msg = await crud.add_chat_message(db, conv_id, body.role, body.content)
    return {
        "id": msg.id, "conversation_id": msg.conversation_id,
        "role": msg.role, "content": msg.content,
        "created_at": msg.created_at.isoformat(),
    }


@router.delete("/conversations/{conv_id}", status_code=204)
async def delete_conversation(
    conv_id: int,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    deleted = await crud.delete_conversation(db, conv_id, user["user_id"])
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found")
