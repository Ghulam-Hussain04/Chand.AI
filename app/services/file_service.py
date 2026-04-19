"""
FileService - Service for managing file CRUD operations

Handles file upload, retrieval, search, and metadata management.
"""
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import File, FileMetadata, Folder
from app.services.storage_service import StorageService
from typing import List, Optional, Dict, Any
import json

class FileService:
    """Service for managing file operations"""
    
    @staticmethod
    async def create_file(
        db: AsyncSession,
        user_id: int,
        folder_id: int,
        filename: str,
        original_filename: str,
        storage_path: str,
        file_type: str,  # 'image' or 'csv'
        file_size: int,
        tags: Optional[List[str]] = None,
        description: Optional[str] = None
    ) -> File:
        """
        Create a new file record
        
        Args:
            db: Database session
            user_id: Owner user ID
            folder_id: Target folder ID
            filename: Stored filename
            original_filename: Original filename before storage
            storage_path: Relative path in storage
            file_type: 'image' or 'csv'
            file_size: File size in bytes
            tags: Optional list of tags
            description: Optional file description
            
        Returns:
            Created File object
            
        Raises:
            ValueError: If folder doesn't exist or access denied
        """
        # Verify folder exists and user has access
        folder_result = await db.execute(
            select(Folder).where(
                (Folder.id == folder_id) &
                (Folder.user_id == user_id)
            )
        )
        
        if not folder_result.scalar_one_or_none():
            raise ValueError("Folder not found or access denied")
        
        # Create file
        new_file = File(
            filename=filename,
            original_filename=original_filename,
            folder_id=folder_id,
            storage_path=storage_path,
            file_type=file_type,
            file_size=file_size,
            user_id=user_id,
            description=description,
            tags=tags or []
        )
        
        db.add(new_file)
        await db.commit()
        await db.refresh(new_file)
        
        return new_file
    
    @staticmethod
    async def get_file(
        db: AsyncSession,
        file_id: int,
        user_id: int
    ) -> Optional[File]:
        """
        Get file by ID with access control
        
        Args:
            db: Database session
            file_id: File ID
            user_id: Requesting user ID
            
        Returns:
            File object or None if not found/access denied
        """
        result = await db.execute(
            select(File).where(
                (File.id == file_id) &
                (File.user_id == user_id)
            )
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_folder_files(
        db: AsyncSession,
        folder_id: int,
        user_id: int
    ) -> List[File]:
        """
        Get all files in a folder
        
        Args:
            db: Database session
            folder_id: Folder ID
            user_id: Requesting user ID (for access control)
            
        Returns:
            List of files in folder
        """
        # Verify user has access to folder
        folder_result = await db.execute(
            select(Folder).where(
                (Folder.id == folder_id) &
                (Folder.user_id == user_id)
            )
        )
        
        if not folder_result.scalar_one_or_none():
            return []
        
        # Get files
        result = await db.execute(
            select(File).where(File.folder_id == folder_id).order_by(File.created_at.desc())
        )
        return result.scalars().all()
    
    @staticmethod
    async def search_files(
        db: AsyncSession,
        user_id: int,
        query: str,
        file_type: Optional[str] = None,
        folder_id: Optional[int] = None,
        limit: int = 50
    ) -> List[File]:
        """
        Search files by filename, tags, or description
        
        Args:
            db: Database session
            user_id: Requesting user ID
            query: Search query (searches filename, tags, description)
            file_type: Optional filter by file type ('image' or 'csv')
            folder_id: Optional filter by folder ID
            limit: Maximum results
            
        Returns:
            List of matching files
        """
        filters = [File.user_id == user_id]
        
        # Add search filters
        search_term = f"%{query}%"
        filters.append(
            or_(
                File.filename.ilike(search_term),
                File.original_filename.ilike(search_term),
                File.description.ilike(search_term),
                File.tags.ilike(search_term)  # JSON array as string search
            )
        )
        
        # Add optional filters
        if file_type:
            filters.append(File.file_type == file_type)
        
        if folder_id:
            # Verify user has access to folder
            folder_result = await db.execute(
                select(Folder).where(
                    (Folder.id == folder_id) &
                    (Folder.user_id == user_id)
                )
            )
            if folder_result.scalar_one_or_none():
                filters.append(File.folder_id == folder_id)
            else:
                return []
        
        # Execute search
        result = await db.execute(
            select(File).where(*filters).order_by(File.created_at.desc()).limit(limit)
        )
        return result.scalars().all()
    
    @staticmethod
    async def update_file_metadata(
        db: AsyncSession,
        file_id: int,
        user_id: int,
        description: Optional[str] = None,
        tags: Optional[List[str]] = None,
        is_processed: Optional[bool] = None
    ) -> Optional[File]:
        """
        Update file metadata
        
        Args:
            db: Database session
            file_id: File ID
            user_id: Requesting user ID
            description: New description (if provided)
            tags: New tags list (if provided)
            is_processed: Processing status (if provided)
            
        Returns:
            Updated File or None if not found
        """
        file = await FileService.get_file(db, file_id, user_id)
        
        if not file:
            return None
        
        if description is not None:
            file.description = description
        
        if tags is not None:
            file.tags = tags
        
        if is_processed is not None:
            file.is_processed = is_processed
        
        await db.commit()
        await db.refresh(file)
        
        return file
    
    @staticmethod
    async def set_file_metadata(
        db: AsyncSession,
        file_id: int,
        width: Optional[int] = None,
        height: Optional[int] = None,
        image_features: Optional[Dict[str, Any]] = None,
        csv_columns: Optional[List[str]] = None,
        csv_row_count: Optional[int] = None,
        custom_metadata: Optional[Dict[str, Any]] = None
    ) -> FileMetadata:
        """
        Create or update file metadata
        
        Args:
            db: Database session
            file_id: File ID
            width: Image width
            height: Image height
            image_features: LLM-extracted image features
            csv_columns: CSV column names
            csv_row_count: CSV row count
            custom_metadata: Custom metadata dictionary
            
        Returns:
            FileMetadata object
        """
        # Check if metadata exists
        result = await db.execute(
            select(FileMetadata).where(FileMetadata.file_id == file_id)
        )
        metadata = result.scalar_one_or_none()
        
        if metadata:
            # Update existing metadata
            if width is not None:
                metadata.width = width
            if height is not None:
                metadata.height = height
            if image_features is not None:
                metadata.image_features = image_features
            if csv_columns is not None:
                metadata.csv_columns = csv_columns
            if csv_row_count is not None:
                metadata.csv_row_count = csv_row_count
            if custom_metadata is not None:
                metadata.custom_metadata = custom_metadata
        else:
            # Create new metadata
            metadata = FileMetadata(
                file_id=file_id,
                width=width,
                height=height,
                image_features=image_features,
                csv_columns=csv_columns,
                csv_row_count=csv_row_count,
                custom_metadata=custom_metadata
            )
            db.add(metadata)
        
        await db.commit()
        await db.refresh(metadata)
        
        return metadata
    
    @staticmethod
    async def delete_file(
        db: AsyncSession,
        file_id: int,
        user_id: int,
        delete_from_storage: bool = True
    ) -> bool:
        """
        Delete file
        
        Args:
            db: Database session
            file_id: File ID
            user_id: Requesting user ID
            delete_from_storage: If True, also delete from disk
            
        Returns:
            True if deleted, False if not found
        """
        file = await FileService.get_file(db, file_id, user_id)
        
        if not file:
            return False
        
        # Delete from storage if requested
        if delete_from_storage:
            try:
                # Extract folder_id and filename from storage_path
                # Path format: files/{user_id}/{folder_id}/{filename}
                parts = file.storage_path.split('/')
                if len(parts) >= 4:
                    folder_id = int(parts[2])
                    filename = parts[-1]
                    await StorageService.delete_file(user_id, folder_id, filename)
            except Exception as e:
                # Log error but don't fail the operation
                print(f"Warning: Failed to delete file from storage: {str(e)}")
        
        # Delete from database (cascades to metadata)
        await db.delete(file)
        await db.commit()
        
        return True
    
    @staticmethod
    async def get_user_file_stats(
        db: AsyncSession,
        user_id: int
    ) -> Dict[str, Any]:
        """
        Get file statistics for user
        
        Args:
            db: Database session
            user_id: User ID
            
        Returns:
            Dictionary with file stats
        """
        # Count all files
        result = await db.execute(
            select(File).where(File.user_id == user_id)
        )
        all_files = result.scalars().all()
        
        # Count by file type
        images = [f for f in all_files if f.file_type == 'image']
        csvs = [f for f in all_files if f.file_type == 'csv']
        
        # Calculate total size
        total_size = sum(f.file_size for f in all_files)
        
        # Count processed files
        processed = sum(1 for f in all_files if f.is_processed)
        
        return {
            "total_files": len(all_files),
            "total_images": len(images),
            "total_csvs": len(csvs),
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "processed_files": processed,
            "unprocessed_files": len(all_files) - processed
        }
    
    @staticmethod
    async def get_recently_modified_files(
        db: AsyncSession,
        user_id: int,
        limit: int = 20
    ) -> List[File]:
        """
        Get recently modified files for user
        
        Args:
            db: Database session
            user_id: User ID
            limit: Maximum results
            
        Returns:
            List of recently modified files
        """
        result = await db.execute(
            select(File).where(File.user_id == user_id)
            .order_by(File.updated_at.desc())
            .limit(limit)
        )
        return result.scalars().all()
