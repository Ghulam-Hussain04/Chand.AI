"""Routes for file operations - Upload, download, search, delete"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import os
from app.db.database import get_db, User
from app.security import verify_token, TokenPayload
from app.schemas import (
    FileResponse as FileResponseSchema, 
    FileCreate, 
    FileUploadResponse,
    FileBatchUploadResponse
)
from app.services import FileService, StorageService, FolderService
from app.utils.image_processor import ImageProcessor

router = APIRouter(prefix="/api/files", tags=["files"])

def get_current_user(token: TokenPayload = Depends(verify_token)) -> TokenPayload:
    """Get current authenticated user"""
    if not token.user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return token

@router.post("/upload", response_model=FileUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(...),
    folder_id: int = Form(...),
    description: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    """Upload a single file to a folder
    
    Args:
        file: File to upload
        folder_id: Target folder ID
        description: Optional file description
        tags: Optional comma-separated tags
        
    Returns:
        Upload result with file ID
    """
    try:
        # Verify folder exists and user has access
        folder = await FolderService.get_folder(db, folder_id, current_user.user_id)
        if not folder:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Folder not found"
            )
        
        # Read file content
        content = await file.read()
        
        # Determine file type and validate
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext in ['.jpg', '.jpeg', '.png']:
            file_type = 'image'
            # Validate image format
            if not ImageProcessor.validate_image_format(content):
                raise ValueError("Invalid image format")
        elif file_ext == '.csv':
            file_type = 'csv'
        else:
            raise ValueError(f"File type not allowed: {file_ext}")
        
        # Save file to storage
        storage_path = await StorageService.save_file(
            content=content,
            user_id=current_user.user_id,
            folder_id=folder_id,
            filename=file.filename
        )
        
        # Parse tags
        tags_list = [t.strip() for t in tags.split(',')] if tags else []
        
        # Create file record in database
        generated_filename = storage_path.split('/')[-1]
        db_file = await FileService.create_file(
            db=db,
            user_id=current_user.user_id,
            folder_id=folder_id,
            filename=generated_filename,
            original_filename=file.filename,
            storage_path=storage_path,
            file_type=file_type,
            file_size=len(content),
            tags=tags_list,
            description=description
        )
        
        # Process image if it's an image file
        if file_type == 'image':
            try:
                # Resize and extract features
                processed_content, features = ImageProcessor.process_uploaded_image(content)
                
                # Save processed image back to storage
                processed_path = await StorageService.save_file(
                    content=processed_content,
                    user_id=current_user.user_id,
                    folder_id=folder_id,
                    filename=f"processed_{generated_filename}"
                )
                
                # Create thumbnail
                thumbnail_content = ImageProcessor.create_thumbnail(processed_content)
                thumbnail_path = await StorageService.save_thumbnail(
                    content=thumbnail_content,
                    user_id=current_user.user_id,
                    file_id=db_file.id
                )
                
                # Update storage path to processed image
                db_file.storage_path = processed_path
                
                # Save metadata
                await FileService.set_file_metadata(
                    db=db,
                    file_id=db_file.id,
                    width=features.get('width'),
                    height=features.get('height'),
                    image_features={
                        "format": features.get('format'),
                        "mode": features.get('mode'),
                        "has_transparency": features.get('has_transparency')
                    }
                )
                
                # Mark as processed
                db_file.is_processed = True
                await db.commit()
            except Exception as e:
                print(f"Warning: Image processing failed: {str(e)}")
                # Continue without processing if it fails
                await db.commit()
        
        return FileUploadResponse(
            file_id=db_file.id,
            filename=db_file.filename,
            original_filename=db_file.original_filename,
            folder_id=folder_id,
            status="success",
            file_size=db_file.file_size
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}"
        )

@router.post("/upload-batch", response_model=FileBatchUploadResponse)
async def upload_batch(
    files: List[UploadFile] = File(...),
    folder_id: int = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    """Upload multiple files to a folder
    
    Args:
        files: List of files to upload
        folder_id: Target folder ID
        
    Returns:
        List of upload results
    """
    results = []
    total_size = 0
    
    for file in files:
        try:
            # Read file content
            content = await file.read()
            total_size += len(content)
            
            # Validate file type
            file_ext = os.path.splitext(file.filename)[1].lower()
            if file_ext in ['.jpg', '.jpeg', '.png']:
                file_type = 'image'
            elif file_ext == '.csv':
                file_type = 'csv'
            else:
                results.append(FileUploadResponse(
                    file_id=0,
                    filename=file.filename,
                    original_filename=file.filename,
                    folder_id=folder_id,
                    status="error",
                    message=f"File type not allowed: {file_ext}",
                    file_size=len(content)
                ))
                continue
            
            # Save file
            storage_path = await StorageService.save_file(
                content=content,
                user_id=current_user.user_id,
                folder_id=folder_id,
                filename=file.filename
            )
            
            # Create database record
            generated_filename = storage_path.split('/')[-1]
            db_file = await FileService.create_file(
                db=db,
                user_id=current_user.user_id,
                folder_id=folder_id,
                filename=generated_filename,
                original_filename=file.filename,
                storage_path=storage_path,
                file_type=file_type,
                file_size=len(content)
            )
            
            results.append(FileUploadResponse(
                file_id=db_file.id,
                filename=db_file.filename,
                original_filename=db_file.original_filename,
                folder_id=folder_id,
                status="success",
                file_size=db_file.file_size
            ))
        
        except Exception as e:
            results.append(FileUploadResponse(
                file_id=0,
                filename=file.filename,
                original_filename=file.filename,
                folder_id=folder_id,
                status="error",
                message=str(e),
                file_size=0
            ))
    
    successful = sum(1 for r in results if r.status == "success")
    failed = sum(1 for r in results if r.status == "error")
    
    return FileBatchUploadResponse(
        files=results,
        total_uploaded=successful,
        total_failed=failed,
        total_size=total_size
    )

@router.get("/{file_id}", response_model=FileResponseSchema)
async def get_file(
    file_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    """Get file metadata
    
    Args:
        file_id: File ID
        
    Returns:
        File metadata
    """
    file = await FileService.get_file(db, file_id, current_user.user_id)
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    return file

@router.get("/download/{file_id}")
async def download_file(
    file_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    """Download file content
    
    Args:
        file_id: File ID
        
    Returns:
        File content as download
    """
    file = await FileService.get_file(db, file_id, current_user.user_id)
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Get file from storage
    try:
        parts = file.storage_path.split('/')
        folder_id = int(parts[2])
        filename = parts[-1]
        
        content = await StorageService.get_file(
            current_user.user_id,
            folder_id,
            filename
        )
        
        return FileResponse(
            content=content,
            filename=file.original_filename,
            media_type="application/octet-stream"
        )
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on disk"
        )

@router.get("/thumbnail/{file_id}")
async def get_thumbnail(
    file_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    """Download file thumbnail
    
    Args:
        file_id: File ID
        
    Returns:
        Thumbnail image
    """
    file = await FileService.get_file(db, file_id, current_user.user_id)
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Get thumbnail from storage
    thumbnail = await StorageService.get_thumbnail(current_user.user_id, file_id)
    
    if not thumbnail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thumbnail not found"
        )
    
    return FileResponse(
        content=thumbnail,
        media_type="image/jpeg"
    )

@router.get("/folder/{folder_id}", response_model=List[FileResponseSchema])
async def list_folder_files(
    folder_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    """Get all files in a folder
    
    Args:
        folder_id: Folder ID
        
    Returns:
        List of files in folder
    """
    files = await FileService.get_folder_files(db, folder_id, current_user.user_id)
    return files

@router.get("/search", response_model=List[FileResponseSchema])
async def search_files(
    query: str,
    file_type: Optional[str] = None,
    folder_id: Optional[int] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    """Search files by filename, tags, or description
    
    Args:
        query: Search query
        file_type: Optional filter (image or csv)
        folder_id: Optional folder scope
        limit: Maximum results
        
    Returns:
        List of matching files
    """
    files = await FileService.search_files(
        db=db,
        user_id=current_user.user_id,
        query=query,
        file_type=file_type,
        folder_id=folder_id,
        limit=limit
    )
    return files

@router.put("/{file_id}")
async def update_file(
    file_id: int,
    description: Optional[str] = None,
    tags: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    """Update file metadata
    
    Args:
        file_id: File ID
        description: New description
        tags: Comma-separated tags
        
    Returns:
        Updated file
    """
    tags_list = [t.strip() for t in tags.split(',')] if tags else None
    
    file = await FileService.update_file_metadata(
        db=db,
        file_id=file_id,
        user_id=current_user.user_id,
        description=description,
        tags=tags_list
    )
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    return file

@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    file_id: int,
    delete_from_storage: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    """Delete file
    
    Args:
        file_id: File ID
        delete_from_storage: If True, also delete from disk
        
    Returns:
        204 No Content on success
    """
    deleted = await FileService.delete_file(
        db=db,
        file_id=file_id,
        user_id=current_user.user_id,
        delete_from_storage=delete_from_storage
    )
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    return None

@router.get("/stats/user")
async def get_user_file_stats(
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    """Get file statistics for current user
    
    Returns:
        User file stats (counts, totals)
    """
    stats = await FileService.get_user_file_stats(db, current_user.user_id)
    return stats

@router.get("/recent/modified", response_model=List[FileResponseSchema])
async def get_recent_files(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    """Get recently modified files for current user
    
    Args:
        limit: Maximum results
        
    Returns:
        List of recently modified files
    """
    files = await FileService.get_recently_modified_files(db, current_user.user_id, limit)
    return files
