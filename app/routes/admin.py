"""Admin routes for user and project access management"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel
from app.db.database import get_db, User, Folder, RoleEnum
from app.schemas import UserResponse, FolderAccessGrant, AdminFolderItem
from app.security import verify_admin, TokenPayload
from app.services import FolderService

router = APIRouter()


class UserUpdateRequest(BaseModel):
    role: Optional[RoleEnum] = None
    username: Optional[str] = None
    email: Optional[str] = None


# ---------------------------------------------------------------------------
# User management
# ---------------------------------------------------------------------------

@router.get("/users", response_model=List[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(verify_admin),
):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    data: UserUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(verify_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if data.role is not None:
        user.role = data.role

    if data.username is not None:
        dup = await db.execute(
            select(User).where((User.username == data.username) & (User.id != user_id))
        )
        if dup.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken")
        user.username = data.username

    if data.email is not None:
        dup = await db.execute(
            select(User).where((User.email == data.email) & (User.id != user_id))
        )
        if dup.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already taken")
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


# ---------------------------------------------------------------------------
# Project (folder) access management
# ---------------------------------------------------------------------------

@router.get("/folders", response_model=List[AdminFolderItem])
async def list_all_folders(
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(verify_admin),
):
    """List all root projects with owner info and per-user access entries."""
    return await FolderService.get_all_root_folders_with_access(db)


@router.get("/folders/{folder_id}/access")
async def get_folder_access(
    folder_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(verify_admin),
):
    """List all users who have access to a project."""
    folder_check = await db.execute(select(Folder).where(Folder.id == folder_id))
    if not folder_check.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")
    return await FolderService.get_folder_access_entries(db, folder_id)


@router.post("/folders/{folder_id}/access", status_code=status.HTTP_201_CREATED)
async def grant_folder_access(
    folder_id: int,
    data: FolderAccessGrant,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(verify_admin),
):
    """Grant or update a user's access to a project."""
    folder_check = await db.execute(select(Folder).where(Folder.id == folder_id))
    if not folder_check.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")

    user_check = await db.execute(select(User).where(User.id == data.user_id))
    if not user_check.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if data.permission_level not in ("read", "write"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="permission_level must be 'read' or 'write'",
        )

    await FolderService.grant_access(db, folder_id, data.user_id, data.permission_level)
    return {"message": "Access granted", "folder_id": folder_id, "user_id": data.user_id, "permission_level": data.permission_level}


@router.delete("/folders/{folder_id}/access/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_folder_access(
    folder_id: int,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(verify_admin),
):
    """Revoke a user's access to a project."""
    revoked = await FolderService.revoke_access(db, folder_id, user_id)
    if not revoked:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Access entry not found")
