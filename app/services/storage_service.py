"""
StorageService - Abstraction layer for file storage operations

This service abstracts file I/O operations, allowing easy swapping between
local filesystem, S3, Supabase, or other storage backends.
"""
import os
import aiofiles
from pathlib import Path
from typing import Optional
from datetime import datetime
from app.config import settings
import hashlib

class StorageService:
    """Service for managing file storage operations"""
    
    # Allowed file extensions
    ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.csv'}
    MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB
    
    @staticmethod
    def get_storage_path() -> str:
        """Get the base storage path"""
        return os.path.join(settings.STORAGE_PATH, "files")
    
    @staticmethod
    def get_user_storage_path(user_id: int) -> str:
        """Get user-specific storage path"""
        return os.path.join(StorageService.get_storage_path(), str(user_id))
    
    @staticmethod
    def get_folder_storage_path(user_id: int, folder_id: int) -> str:
        """Get folder-specific storage path within user directory"""
        return os.path.join(StorageService.get_user_storage_path(user_id), str(folder_id))
    
    @staticmethod
    def get_thumbnails_path(user_id: int) -> str:
        """Get thumbnails storage path for user"""
        return os.path.join(StorageService.get_user_storage_path(user_id), "thumbnails")
    
    @staticmethod
    def validate_filename(filename: str) -> bool:
        """Validate filename is allowed"""
        if not filename:
            return False
        ext = os.path.splitext(filename)[1].lower()
        return ext in StorageService.ALLOWED_EXTENSIONS
    
    @staticmethod
    def validate_file_size(size_bytes: int) -> bool:
        """Validate file size is within limits"""
        return 0 < size_bytes <= StorageService.MAX_FILE_SIZE
    
    @staticmethod
    def generate_storage_filename(original_filename: str) -> str:
        """Generate a unique storage filename with timestamp"""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        name, ext = os.path.splitext(original_filename)
        # Create hash of timestamp for uniqueness
        hash_part = hashlib.md5(timestamp.encode()).hexdigest()[:8]
        return f"{name}_{timestamp}_{hash_part}{ext}"
    
    @staticmethod
    def validate_path_safety(full_path: str) -> bool:
        """
        Security check: ensure path doesn't escape storage directory
        Prevents directory traversal attacks
        """
        storage_base = os.path.normpath(StorageService.get_storage_path())
        full_path = os.path.normpath(full_path)
        return full_path.startswith(storage_base)
    
    @staticmethod
    async def save_file(
        content: bytes,
        user_id: int,
        folder_id: int,
        filename: str
    ) -> str:
        """
        Save file to storage and return relative path
        
        Args:
            content: File content bytes
            user_id: Owner user ID
            folder_id: Target folder ID
            filename: Original filename
            
        Returns:
            Relative storage path for the file
            
        Raises:
            ValueError: If validation fails
            OSError: If file I/O fails
        """
        # Validate inputs
        if not StorageService.validate_filename(filename):
            raise ValueError(f"File type not allowed. Allowed: {StorageService.ALLOWED_EXTENSIONS}")
        
        if not StorageService.validate_file_size(len(content)):
            raise ValueError(f"File size exceeds maximum allowed ({StorageService.MAX_FILE_SIZE} bytes)")
        
        # Create directory structure
        folder_path = StorageService.get_folder_storage_path(user_id, folder_id)
        os.makedirs(folder_path, exist_ok=True)
        
        # Generate unique storage filename
        storage_filename = StorageService.generate_storage_filename(filename)
        full_path = os.path.join(folder_path, storage_filename)
        
        # Security check
        if not StorageService.validate_path_safety(full_path):
            raise ValueError("Path traversal attempt detected")
        
        # Write file
        async with aiofiles.open(full_path, mode='wb') as f:
            await f.write(content)
        
        # Return relative path for database storage
        # Path format: files/{user_id}/{folder_id}/{filename}
        relative_path = f"files/{user_id}/{folder_id}/{storage_filename}"
        return relative_path
    
    @staticmethod
    async def get_file(
        user_id: int,
        folder_id: int,
        filename: str
    ) -> bytes:
        """
        Retrieve file content from storage
        
        Args:
            user_id: Owner user ID (for security check)
            folder_id: Folder ID
            filename: Stored filename
            
        Returns:
            File content bytes
            
        Raises:
            FileNotFoundError: If file doesn't exist
            ValueError: If path is invalid
        """
        folder_path = StorageService.get_folder_storage_path(user_id, folder_id)
        full_path = os.path.join(folder_path, filename)
        
        # Security check
        if not StorageService.validate_path_safety(full_path):
            raise ValueError("Path traversal attempt detected")
        
        if not os.path.exists(full_path):
            raise FileNotFoundError(f"File not found: {filename}")
        
        async with aiofiles.open(full_path, mode='rb') as f:
            content = await f.read()
        
        return content
    
    @staticmethod
    async def delete_file(
        user_id: int,
        folder_id: int,
        filename: str
    ) -> bool:
        """
        Delete file from storage
        
        Args:
            user_id: Owner user ID (for security check)
            folder_id: Folder ID
            filename: Stored filename
            
        Returns:
            True if deleted, False if file didn't exist
            
        Raises:
            ValueError: If path is invalid
        """
        folder_path = StorageService.get_folder_storage_path(user_id, folder_id)
        full_path = os.path.join(folder_path, filename)
        
        # Security check
        if not StorageService.validate_path_safety(full_path):
            raise ValueError("Path traversal attempt detected")
        
        if os.path.exists(full_path):
            os.remove(full_path)
            return True
        
        return False
    
    @staticmethod
    def get_file_size(full_path: str) -> int:
        """Get file size in bytes"""
        if not os.path.exists(full_path):
            return 0
        return os.path.getsize(full_path)
    
    @staticmethod
    async def save_thumbnail(
        content: bytes,
        user_id: int,
        file_id: int,
        quality: int = 85
    ) -> str:
        """
        Save thumbnail for image file
        
        Args:
            content: Thumbnail image bytes
            user_id: Owner user ID
            file_id: Source file ID
            quality: JPEG quality (1-100, default 85)
            
        Returns:
            Relative path to thumbnail
        """
        thumbnails_path = StorageService.get_thumbnails_path(user_id)
        os.makedirs(thumbnails_path, exist_ok=True)
        
        thumbnail_filename = f"thumb_{file_id}.jpg"
        full_path = os.path.join(thumbnails_path, thumbnail_filename)
        
        if not StorageService.validate_path_safety(full_path):
            raise ValueError("Path traversal attempt detected")
        
        async with aiofiles.open(full_path, mode='wb') as f:
            await f.write(content)
        
        relative_path = f"files/{user_id}/thumbnails/{thumbnail_filename}"
        return relative_path
    
    @staticmethod
    async def get_thumbnail(
        user_id: int,
        file_id: int
    ) -> Optional[bytes]:
        """
        Retrieve thumbnail for file
        
        Returns:
            Thumbnail bytes or None if doesn't exist
        """
        thumbnails_path = StorageService.get_thumbnails_path(user_id)
        thumbnail_filename = f"thumb_{file_id}.jpg"
        full_path = os.path.join(thumbnails_path, thumbnail_filename)
        
        if not StorageService.validate_path_safety(full_path):
            return None
        
        if not os.path.exists(full_path):
            return None
        
        async with aiofiles.open(full_path, mode='rb') as f:
            content = await f.read()
        
        return content
