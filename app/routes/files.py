from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Depends
from fastapi.responses import FileResponse
import os
from pathlib import Path
from datetime import datetime
from app.config import settings
from app.schemas import (
    ImageUploadResponse,
    DirectoryStructure,
    DirectoryItem,
    FolderContents,
    ImageFileResponse,
)
from app.utils.image_manager import ImageManager
from app.security import verify_token, verify_admin, TokenPayload

router = APIRouter()


@router.post("/images/upload")
async def upload_image(
    file: UploadFile = File(...),
    mission_name: str = Query(..., description="Mission name for organizing images"),
    current_user: TokenPayload = Depends(verify_admin)
):
    """
    Upload an image file to storage/images/{mission_name}/
    
    Parameters:
    - file: Image file to upload
    - mission_name: Name of the mission/folder to organize images
    """
    
    # Validate file
    if not file.filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    if not ImageManager.is_allowed_file(file.filename):
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed types: {', '.join(ImageManager.ALLOWED_EXTENSIONS)}"
        )
    
    try:
        # Create directory structure
        mission_dir = ImageManager.create_mission_directory(mission_name)
        
        # Generate file path
        file_path = os.path.join(mission_dir, file.filename)
        
        # Handle file name conflicts
        file_path = ImageManager.generate_unique_filename(file_path)
        
        # Read and write file
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)
        
        # Return response
        relative_path = ImageManager.get_relative_path_for_url(file_path)
        
        return ImageUploadResponse(
            filename=os.path.basename(file_path),
            mission_name=mission_name,
            path=relative_path,
            created_at=datetime.utcnow().isoformat()
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")


# @router.get("/images")
# async def get_images_root():
#     """
#     Get the root directory structure of storage/images/
#     Returns all top-level missions (folders) and any files in the root
#     """
    
#     images_dir = ImageManager.get_images_directory()
    
#     # Create images directory if it doesn't exist
#     os.makedirs(images_dir, exist_ok=True)
    
#     try:
#         items = []
        
#         # List items in the images directory
#         for item_name in os.listdir(images_dir):
#             item_path = os.path.join(images_dir, item_name)
#             relative_path = ImageManager.get_relative_path_for_url(item_path)
            
#             if os.path.isdir(item_path):
#                 items.append(DirectoryItem(
#                     name=item_name,
#                     type="folder",
#                     path=relative_path
#                 ))
#             elif ImageManager.is_allowed_file(item_name):
#                 items.append(DirectoryItem(
#                     name=item_name,
#                     type="file",
#                     path=relative_path
#                 ))
        
#         # Sort: folders first, then files, alphabetically
#         items.sort(key=lambda x: (x.type != "folder", x.name.lower()))
        
#         return DirectoryStructure(
#             current_path="images",
#             items=items
#         )
    
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Error reading directory: {str(e)}")


@router.get("/images/{path:path}")
async def get_folder_contents(
    path: str,
    current_user: TokenPayload = Depends(verify_token)
):
    """
    Get contents of a specific folder within images directory OR serve an image file.
    
    If path is a directory:
    - Returns both subfolders and image files with their URLs.
    
    If path is an image file:
    - Serves the image file directly for viewing in frontend
    
    Parameters:
    - path: Relative path within images directory
      - For directory: "mission1" or "mission1/subfolder"
      - For file: "mission1/image.jpg" or "mission1/subfolder/image.png"
    """
    
    images_dir = ImageManager.get_images_directory()
    full_path = os.path.normpath(os.path.join(images_dir, path))
    
    # Security check: ensure path doesn't escape images directory
    if not ImageManager.validate_path_safety(full_path):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if path exists
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="Path not found")
    
    # If it's a file, serve it directly
    if os.path.isfile(full_path):
        if not ImageManager.is_allowed_file(full_path):
            raise HTTPException(status_code=400, detail="File type not allowed")
        
        return FileResponse(
            path=full_path,
            media_type="image/jpeg",  # Will be auto-detected by browser
            filename=os.path.basename(full_path)
        )
    
    # If it's a directory, list contents
    if os.path.isdir(full_path):
        try:
            folders = []
            images = []
            
            # List items in the directory
            for item_name in os.listdir(full_path):
                item_path = os.path.join(full_path, item_name)
                relative_path = ImageManager.get_relative_path_for_url(item_path)
                
                if os.path.isdir(item_path):
                    folders.append(DirectoryItem(
                        name=item_name,
                        type="folder",
                        path=relative_path
                    ))
                elif ImageManager.is_allowed_file(item_name):
                    # Generate URL for the image
                    url = f"/files/images/{relative_path}"
                    images.append(ImageFileResponse(
                        name=item_name,
                        url=url
                    ))
            
            # Sort both lists alphabetically
            folders.sort(key=lambda x: x.name.lower())
            images.sort(key=lambda x: x.name.lower())
            
            return FolderContents(
                current_path=path,
                folders=folders,
                images=images
            )
        
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error reading directory: {str(e)}")


@router.get("/")
async def get_root():
    """Legacy upload endpoint - kept for backward compatibility"""
    return {"message": "Use POST /images/upload for uploading images"}

