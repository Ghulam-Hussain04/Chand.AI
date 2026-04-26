"""Routes for folder operations - CRUD and hierarchy management"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.db.database import get_db, User
from app.security import verify_token, TokenPayload
from app.schemas import FolderResponse, FolderCreate, FolderWithContents
from app.services import FolderService

router = APIRouter()

def get_current_user(token: TokenPayload = Depends(verify_token)) -> TokenPayload:
    """Get current authenticated user"""
    if not token.user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return token

@router.post("", response_model=FolderResponse, status_code=status.HTTP_201_CREATED)
async def create_folder(
    folder_data: FolderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    """Create a new folder
    
    Args:
        folder_data: Folder creation data including name and optional parent_id
        
    Returns:
        Created folder
    """
    try:
        folder = await FolderService.create_folder(
            db=db,
            user_id=current_user.user_id,
            folder_data=folder_data
        )
        return folder
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/{folder_id}", response_model=FolderResponse)
async def get_folder(
    folder_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    """Get folder by ID
    
    Args:
        folder_id: ID of folder to retrieve
        
    Returns:
        Folder details
    """
    folder = await FolderService.get_folder(
        db=db,
        folder_id=folder_id,
        user_id=current_user.user_id
    )
    
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found"
        )
    
    return folder

@router.get("", response_model=List[FolderResponse])
async def list_user_root_folders(
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    """Get all root-level folders for current user
    
    Returns:
        List of root folders
    """
    folders = await FolderService.get_user_root_folders(
        db=db,
        user_id=current_user.user_id
    )
    return folders

@router.get("/{folder_id}/subfolders", response_model=List[FolderResponse])
async def list_subfolders(
    folder_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    """Get all subfolders of a folder
    
    Args:
        folder_id: Parent folder ID
        
    Returns:
        List of subfolders
    """
    # Verify user has access to parent folder
    parent = await FolderService.get_folder(db, folder_id, current_user.user_id)
    if not parent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parent folder not found"
        )
    
    subfolders = await FolderService.get_subfolders(
        db=db,
        parent_id=folder_id,
        user_id=current_user.user_id
    )
    return subfolders

@router.get("/{folder_id}/hierarchy", response_model=dict)
async def get_folder_hierarchy(
    folder_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    """Get complete folder hierarchy (tree structure)
    
    Args:
        folder_id: Root folder ID for hierarchy
        
    Returns:
        Tree structure with nested subfolders
    """
    hierarchy = await FolderService.get_folder_hierarchy(
        db=db,
        folder_id=folder_id,
        user_id=current_user.user_id
    )
    
    if not hierarchy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found"
        )
    
    return hierarchy

@router.put("/{folder_id}", response_model=FolderResponse)
async def update_folder(
    folder_id: int,
    name: Optional[str] = None,
    description: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    """Update folder metadata (name and/or description)
    
    Args:
        folder_id: Folder to update
        name: New name (optional)
        description: New description (optional)
        
    Returns:
        Updated folder
    """
    folder = await FolderService.update_folder(
        db=db,
        folder_id=folder_id,
        user_id=current_user.user_id,
        name=name,
        description=description
    )
    
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found"
        )
    
    return folder

@router.post("/{folder_id}/move")
async def move_folder(
    folder_id: int,
    new_parent_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    """Move folder to different parent
    
    Args:
        folder_id: Folder to move
        new_parent_id: New parent folder ID (None for root)
        
    Returns:
        Updated folder with new parent_id
    """
    try:
        folder = await FolderService.move_folder(
            db=db,
            folder_id=folder_id,
            new_parent_id=new_parent_id,
            user_id=current_user.user_id
        )
        
        if not folder:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Folder not found"
            )
        
        return {"message": "Folder moved successfully", "folder": folder}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_folder(
    folder_id: int,
    cascade: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    """Delete folder
    
    Args:
        folder_id: Folder to delete
        cascade: If True, delete all contents. If False, only empty folders.
        
    Returns:
        204 No Content on success
    """
    try:
        deleted = await FolderService.delete_folder(
            db=db,
            folder_id=folder_id,
            user_id=current_user.user_id,
            cascade=cascade
        )
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Folder not found or not empty (when cascade=False)"
            )
        
        return None
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/{folder_id}/stats")
async def get_folder_stats(
    folder_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    """Get folder statistics (file count, subfolder count)
    
    Args:
        folder_id: Folder ID
        
    Returns:
        Dictionary with counts
    """
    # Verify user has access to folder
    folder = await FolderService.get_folder(db, folder_id, current_user.user_id)
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found"
        )
    
    stats = await FolderService.get_folder_contents_count(db, folder_id)
    return {"folder_id": folder_id, **stats}
