"""Admin routes for user management"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel
from app.db.database import get_db, User, RoleEnum
from app.schemas import UserResponse
from app.security import verify_admin, TokenPayload

router = APIRouter()


class UserUpdateRequest(BaseModel):
    role: Optional[RoleEnum] = None
    username: Optional[str] = None
    email: Optional[str] = None


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(verify_admin),
):
    """List all users — admin only"""
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    data: UserUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(verify_admin),
):
    """Update a user's role (and optionally username/email) — admin only"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if data.role is not None:
        user.role = data.role

    if data.username is not None:
        # Check uniqueness
        dup = await db.execute(
            select(User).where((User.username == data.username) & (User.id != user_id))
        )
        if dup.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken"
            )
        user.username = data.username

    if data.email is not None:
        dup = await db.execute(
            select(User).where((User.email == data.email) & (User.id != user_id))
        )
        if dup.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Email already taken"
            )
        user.email = data.email

    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(verify_admin),
):
    """Delete a user — admin only"""
    if user_id == current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    await db.delete(user)
    await db.commit()
    return None
