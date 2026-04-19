"""
FolderService - Service for managing folder hierarchy and operations

Handles folder CRUD, hierarchy management, and access control.
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import Folder, File
from app.schemas import FolderResponse, FolderCreate
from typing import List, Optional, Dict, Any

class FolderService:
    """Service for managing folder operations"""
    
    @staticmethod
    async def create_folder(
        db: AsyncSession,
        user_id: int,
        folder_data: FolderCreate
    ) -> Folder:
        """
        Create a new folder
        
        Args:
            db: Database session
            user_id: Owner user ID
            folder_data: Folder creation data
            
        Returns:
            Created Folder object
            
        Raises:
            ValueError: If parent folder doesn't exist or access denied
        """
        # If parent_id specified, verify it exists and user has access
        if folder_data.parent_id:
            result = await db.execute(
                select(Folder).where(
                    (Folder.id == folder_data.parent_id) &
                    (Folder.user_id == user_id)
                )
            )
            parent_folder = result.scalar_one_or_none()
            
            if not parent_folder:
                raise ValueError("Parent folder not found or access denied")
        
        # Create new folder
        new_folder = Folder(
            name=folder_data.name,
            parent_id=folder_data.parent_id,
            user_id=user_id,
            description=folder_data.description
        )
        
        db.add(new_folder)
        await db.commit()
        await db.refresh(new_folder)
        
        return new_folder
    
    @staticmethod
    async def get_folder(
        db: AsyncSession,
        folder_id: int,
        user_id: int
    ) -> Optional[Folder]:
        """
        Get folder by ID with access control
        
        Args:
            db: Database session
            folder_id: Folder ID
            user_id: Requesting user ID
            
        Returns:
            Folder object or None if not found
        """
        result = await db.execute(
            select(Folder).where(
                (Folder.id == folder_id) &
                (Folder.user_id == user_id)
            )
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_user_root_folders(
        db: AsyncSession,
        user_id: int
    ) -> List[Folder]:
        """
        Get all root-level folders for user
        
        Returns:
            List of root folders (parent_id is None)
        """
        result = await db.execute(
            select(Folder).where(
                (Folder.user_id == user_id) &
                (Folder.parent_id == None)
            ).order_by(Folder.name)
        )
        return result.scalars().all()
    
    @staticmethod
    async def get_subfolders(
        db: AsyncSession,
        parent_id: int,
        user_id: int
    ) -> List[Folder]:
        """
        Get all subfolders of a parent folder
        
        Args:
            db: Database session
            parent_id: Parent folder ID
            user_id: Requesting user ID
            
        Returns:
            List of subfolders
        """
        result = await db.execute(
            select(Folder).where(
                (Folder.parent_id == parent_id) &
                (Folder.user_id == user_id)
            ).order_by(Folder.name)
        )
        return result.scalars().all()
    
    @staticmethod
    async def get_folder_hierarchy(
        db: AsyncSession,
        folder_id: int,
        user_id: int
    ) -> Optional[Dict[str, Any]]:
        """
        Get complete folder hierarchy (tree structure)
        
        Returns:
            Dictionary representing folder tree or None if not found
        """
        folder = await FolderService.get_folder(db, folder_id, user_id)
        
        if not folder:
            return None
        
        # Get all subfolders
        subfolders = await FolderService.get_subfolders(db, folder_id, user_id)
        
        # Get file count in this folder
        file_result = await db.execute(
            select(File).where(File.folder_id == folder_id)
        )
        file_count = len(file_result.scalars().all())
        
        # Build tree structure recursively
        children = []
        for subfolder in subfolders:
            child_tree = await FolderService.get_folder_hierarchy(db, subfolder.id, user_id)
            if child_tree:
                children.append(child_tree)
        
        return {
            "id": folder.id,
            "name": folder.name,
            "description": folder.description,
            "parent_id": folder.parent_id,
            "created_at": folder.created_at,
            "updated_at": folder.updated_at,
            "file_count": file_count,
            "subfolders": children
        }
    
    @staticmethod
    async def update_folder(
        db: AsyncSession,
        folder_id: int,
        user_id: int,
        name: Optional[str] = None,
        description: Optional[str] = None
    ) -> Optional[Folder]:
        """
        Update folder metadata
        
        Returns:
            Updated Folder or None if not found
        """
        folder = await FolderService.get_folder(db, folder_id, user_id)
        
        if not folder:
            return None
        
        if name:
            folder.name = name
        if description is not None:  # Allow empty string to clear description
            folder.description = description
        
        await db.commit()
        await db.refresh(folder)
        
        return folder
    
    @staticmethod
    async def move_folder(
        db: AsyncSession,
        folder_id: int,
        new_parent_id: Optional[int],
        user_id: int
    ) -> Optional[Folder]:
        """
        Move folder to different parent
        
        Args:
            db: Database session
            folder_id: Folder to move
            new_parent_id: New parent folder ID (None for root)
            user_id: Requesting user ID
            
        Returns:
            Updated Folder or None if not found
            
        Raises:
            ValueError: If trying to move to invalid parent or creating cycle
        """
        folder = await FolderService.get_folder(db, folder_id, user_id)
        
        if not folder:
            return None
        
        # Check for cycle - can't move folder to itself or its children
        if new_parent_id == folder_id:
            raise ValueError("Cannot move folder to itself")
        
        # If moving to different parent, verify parent exists and user has access
        if new_parent_id:
            parent = await FolderService.get_folder(db, new_parent_id, user_id)
            if not parent:
                raise ValueError("Parent folder not found or access denied")
        
        # Check if new_parent_id is a child of folder_id (would create cycle)
        if new_parent_id:
            current_parent_id = new_parent_id
            max_depth = 100  # Prevent infinite loops
            depth = 0
            
            while current_parent_id and depth < max_depth:
                if current_parent_id == folder_id:
                    raise ValueError("Cannot move folder to one of its children (would create cycle)")
                
                parent = await FolderService.get_folder(db, current_parent_id, user_id)
                current_parent_id = parent.parent_id if parent else None
                depth += 1
        
        # Move folder
        folder.parent_id = new_parent_id
        await db.commit()
        await db.refresh(folder)
        
        return folder
    
    @staticmethod
    async def delete_folder(
        db: AsyncSession,
        folder_id: int,
        user_id: int,
        cascade: bool = True
    ) -> bool:
        """
        Delete folder
        
        Args:
            db: Database session
            folder_id: Folder to delete
            user_id: Requesting user ID
            cascade: If True, delete all files and subfolders. If False, only delete empty folder.
            
        Returns:
            True if deleted, False if not found or folder not empty (when cascade=False)
            
        Raises:
            ValueError: If access denied
        """
        folder = await FolderService.get_folder(db, folder_id, user_id)
        
        if not folder:
            return False
        
        if not cascade:
            # Check if folder has contents
            file_result = await db.execute(
                select(File).where(File.folder_id == folder_id)
            )
            if file_result.scalar_one_or_none():
                return False
            
            subfolder_result = await db.execute(
                select(Folder).where(Folder.parent_id == folder_id)
            )
            if subfolder_result.scalar_one_or_none():
                return False
        
        # Delete folder (cascade is handled by SQLAlchemy relationship)
        await db.delete(folder)
        await db.commit()
        
        return True
    
    @staticmethod
    async def get_folder_contents_count(
        db: AsyncSession,
        folder_id: int
    ) -> Dict[str, int]:
        """
        Get count of files and subfolders in folder
        
        Returns:
            Dictionary with 'files' and 'subfolders' counts
        """
        # Count files
        file_result = await db.execute(
            select(File).where(File.folder_id == folder_id)
        )
        file_count = len(file_result.scalars().all())
        
        # Count subfolders
        subfolder_result = await db.execute(
            select(Folder).where(Folder.parent_id == folder_id)
        )
        subfolder_count = len(subfolder_result.scalars().all())
        
        return {
            "files": file_count,
            "subfolders": subfolder_count
        }
