"""Chat session management routes."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.db.database import get_db, ChatSession, Chat
from app.security import verify_token, TokenPayload

router = APIRouter()


def get_current_user(token: TokenPayload = Depends(verify_token)) -> TokenPayload:
    if not token.user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return token


class ChatMessageOut(BaseModel):
    id: int
    question: str
    response: str
    time: datetime
    file_id: Optional[int] = None

    class Config:
        from_attributes = True


class ChatSessionOut(BaseModel):
    id: int
    title: str
    created_at: datetime
    message_count: int


class ChatSessionDetailOut(BaseModel):
    id: int
    title: str
    created_at: datetime
    messages: List[ChatMessageOut]


@router.get("/sessions", response_model=List[ChatSessionOut])
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    """List all chat sessions for the current user, newest first."""
    result = await db.execute(
        select(ChatSession)
        .where(
            ChatSession.user_id == current_user.user_id,
            ChatSession.is_deleted == False,
        )
        .order_by(ChatSession.created_at.desc())
    )
    sessions = result.scalars().all()

    out = []
    for s in sessions:
        count_result = await db.execute(
            select(func.count(Chat.id)).where(Chat.chat_session_id == s.id)
        )
        count = count_result.scalar() or 0
        out.append(
            ChatSessionOut(
                id=s.id,
                title=s.title,
                created_at=s.created_at,
                message_count=count,
            )
        )
    return out


@router.get("/sessions/{session_id}", response_model=ChatSessionDetailOut)
async def get_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    """Get a chat session with all its messages."""
    session_result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.user_id,
            ChatSession.is_deleted == False,
        )
    )
    session = session_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    chats_result = await db.execute(
        select(Chat)
        .where(Chat.chat_session_id == session_id)
        .order_by(Chat.time.asc())
    )
    chats = chats_result.scalars().all()

    messages = [
        ChatMessageOut(
            id=c.id,
            question=c.question,
            response=c.response,
            time=c.time,
            file_id=c.file_id,
        )
        for c in chats
    ]

    return ChatSessionDetailOut(
        id=session.id,
        title=session.title,
        created_at=session.created_at,
        messages=messages,
    )


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    """Soft-delete a chat session."""
    session_result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.user_id,
        )
    )
    session = session_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    session.is_deleted = True
    await db.commit()
    return None
