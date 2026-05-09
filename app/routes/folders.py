"""Routes for folder operations — CRUD, hierarchy, and project specifications."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.db.database import get_db
from app.security import verify_token, TokenPayload
from app.schemas import (
    FolderResponse,
    FolderCreate,
    ProjectSpecificationCreate,
    ProjectSpecificationUpdate,
    ProjectSpecificationResponse,
)
from app.services import FolderService
from app.services.specification_service import SpecificationService

router = APIRouter()


def get_current_user(token: TokenPayload = Depends(verify_token)) -> TokenPayload:
    if not token.user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return token


# ---------------------------------------------------------------------------
# Folder CRUD
# ---------------------------------------------------------------------------

@router.post("", response_model=FolderResponse, status_code=status.HTTP_201_CREATED)
async def create_folder(
    folder_data: FolderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Create a new project folder.

    Optionally pass `specifications` to set custom mission calibration params.
    If omitted, Chang'e 3 defaults are applied automatically.
    """
    try:
        folder = await FolderService.create_folder(
            db=db,
            user_id=current_user.user_id,
            folder_data=folder_data,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    # Create project specification — custom or default
    if folder_data.specifications:
        s = folder_data.specifications
        await SpecificationService.upsert(
            db=db,
            folder_id=folder.id,
            mission_name=s.mission_name,
            meters_per_pixel=s.meters_per_pixel,
            camera_angle_deg=s.camera_angle_deg,
            camera_resolution_w=s.camera_resolution_w,
            camera_resolution_h=s.camera_resolution_h,
            camera_fov_deg=s.camera_fov_deg,
            rover_height_m=s.rover_height_m,
            notes=s.notes,
        )
    else:
        await SpecificationService.create_default(db=db, folder_id=folder.id)

    return folder


@router.get("/hierarchy")
async def get_root_hierarchy(
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    """Full hierarchy tree for all root folders owned by the current user."""
    return await FolderService.get_user_folder_trees(db, current_user.user_id)


@router.get("", response_model=List[FolderResponse])
async def list_user_root_folders(
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    """List all root-level folders for the current user."""
    return await FolderService.get_user_root_folders(db=db, user_id=current_user.user_id)


@router.get("/{folder_id}", response_model=FolderResponse)
async def get_folder(
    folder_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    folder = await FolderService.get_folder(db=db, folder_id=folder_id, user_id=current_user.user_id)
    if not folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")
    return folder


@router.get("/{folder_id}/subfolders", response_model=List[FolderResponse])
async def list_subfolders(
    folder_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    parent = await FolderService.get_folder(db, folder_id, current_user.user_id)
    if not parent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent folder not found")
    return await FolderService.get_subfolders(db=db, parent_id=folder_id, user_id=current_user.user_id)


@router.get("/{folder_id}/hierarchy", response_model=dict)
async def get_folder_hierarchy(
    folder_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    hierarchy = await FolderService.get_folder_hierarchy(
        db=db, folder_id=folder_id, user_id=current_user.user_id
    )
    if not hierarchy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")
    return hierarchy


@router.put("/{folder_id}", response_model=FolderResponse)
async def update_folder(
    folder_id: int,
    name: Optional[str] = None,
    description: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    """Update folder name and/or description via query parameters."""
    folder = await FolderService.update_folder(
        db=db,
        folder_id=folder_id,
        user_id=current_user.user_id,
        name=name,
        description=description,
    )
    if not folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")
    return folder


@router.post("/{folder_id}/move")
async def move_folder(
    folder_id: int,
    new_parent_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    try:
        folder = await FolderService.move_folder(
            db=db,
            folder_id=folder_id,
            new_parent_id=new_parent_id,
            user_id=current_user.user_id,
        )
        if not folder:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")
        return {"message": "Folder moved successfully", "folder": folder}
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_folder(
    folder_id: int,
    cascade: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    try:
        deleted = await FolderService.delete_folder(
            db=db,
            folder_id=folder_id,
            user_id=current_user.user_id,
            cascade=cascade,
        )
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Folder not found or not empty (cascade=False)",
            )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/{folder_id}/stats")
async def get_folder_stats(
    folder_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    folder = await FolderService.get_folder(db, folder_id, current_user.user_id)
    if not folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")
    stats = await FolderService.get_folder_contents_count(db, folder_id)
    return {"folder_id": folder_id, **stats}


# ---------------------------------------------------------------------------
# Project Specification sub-resource
# ---------------------------------------------------------------------------

@router.get("/{folder_id}/specifications", response_model=ProjectSpecificationResponse)
async def get_specifications(
    folder_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Get mission calibration specifications for a project folder.

    Automatically creates and returns Chang'e 3 defaults if none exist.
    """
    folder = await FolderService.get_folder(db, folder_id, current_user.user_id)
    if not folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")
    return await SpecificationService.get_or_create_default(db, folder_id)


@router.put("/{folder_id}/specifications", response_model=ProjectSpecificationResponse)
async def update_specifications(
    folder_id: int,
    data: ProjectSpecificationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Update mission calibration specifications for a project folder.

    Only provided fields are updated; omitted fields retain their current value.
    """
    folder = await FolderService.get_folder(db, folder_id, current_user.user_id)
    if not folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")

    # Load existing (or default) then apply partial updates
    existing = await SpecificationService.get_or_create_default(db, folder_id)

    return await SpecificationService.upsert(
        db=db,
        folder_id=folder_id,
        mission_name=data.mission_name if data.mission_name is not None else existing.mission_name,
        meters_per_pixel=data.meters_per_pixel if data.meters_per_pixel is not None else existing.meters_per_pixel,
        camera_angle_deg=data.camera_angle_deg if data.camera_angle_deg is not None else existing.camera_angle_deg,
        camera_resolution_w=data.camera_resolution_w if data.camera_resolution_w is not None else existing.camera_resolution_w,
        camera_resolution_h=data.camera_resolution_h if data.camera_resolution_h is not None else existing.camera_resolution_h,
        camera_fov_deg=data.camera_fov_deg if data.camera_fov_deg is not None else existing.camera_fov_deg,
        rover_height_m=data.rover_height_m if data.rover_height_m is not None else existing.rover_height_m,
        notes=data.notes if data.notes is not None else existing.notes,
    )


@router.post("/{folder_id}/specifications", response_model=ProjectSpecificationResponse, status_code=status.HTTP_201_CREATED)
async def set_specifications(
    folder_id: int,
    data: ProjectSpecificationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Set (create or fully replace) mission calibration specifications for a project folder.
    """
    folder = await FolderService.get_folder(db, folder_id, current_user.user_id)
    if not folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")

    return await SpecificationService.upsert(
        db=db,
        folder_id=folder_id,
        mission_name=data.mission_name,
        meters_per_pixel=data.meters_per_pixel,
        camera_angle_deg=data.camera_angle_deg,
        camera_resolution_w=data.camera_resolution_w,
        camera_resolution_h=data.camera_resolution_h,
        camera_fov_deg=data.camera_fov_deg,
        rover_height_m=data.rover_height_m,
        notes=data.notes,
    )
