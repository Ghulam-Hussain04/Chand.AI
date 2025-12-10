"""
Image management utilities for file operations and directory handling
"""

import os
from pathlib import Path
from typing import List, Tuple
from app.config import settings


class ImageManager:
    """Utility class for managing image uploads and retrieval"""
    
    ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png'}
    
    @staticmethod
    def get_images_directory() -> str:
        """Get the images storage directory path"""
        return os.path.join(settings.STORAGE_PATH, "images")
    
    @staticmethod
    def is_allowed_file(filename: str) -> bool:
        """Check if file extension is allowed"""
        return os.path.splitext(filename)[1].lower() in ImageManager.ALLOWED_EXTENSIONS
    
    @staticmethod
    def get_relative_path_for_url(full_path: str) -> str:
        """Convert full path to relative URL path"""
        images_dir = ImageManager.get_images_directory()
        rel_path = os.path.relpath(full_path, images_dir)
        # Convert Windows backslashes to forward slashes for URL
        return rel_path.replace('\\', '/')
    
    @staticmethod
    def validate_path_safety(full_path: str) -> bool:
        """
        Security check: ensure path doesn't escape images directory
        Returns True if path is safe, False otherwise
        """
        images_dir = os.path.normpath(ImageManager.get_images_directory())
        full_path = os.path.normpath(full_path)
        return full_path.startswith(images_dir)
    
    @staticmethod
    def create_mission_directory(mission_name: str) -> str:
        """
        Create mission-specific directory if it doesn't exist
        Returns the full path to the mission directory
        """
        images_base = ImageManager.get_images_directory()
        mission_dir = os.path.join(images_base, mission_name)
        os.makedirs(mission_dir, exist_ok=True)
        return mission_dir
    
    @staticmethod
    def generate_unique_filename(filepath: str) -> str:
        """
        Generate a unique filename if the file already exists
        Appends timestamp to filename
        """
        if not os.path.exists(filepath):
            return filepath
        
        from datetime import datetime
        directory = os.path.dirname(filepath)
        filename = os.path.basename(filepath)
        name, ext = os.path.splitext(filename)
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        new_filename = f"{name}_{timestamp}{ext}"
        return os.path.join(directory, new_filename)
    
    @staticmethod
    def list_directory_contents(directory_path: str) -> Tuple[List[str], List[str]]:
        """
        List contents of a directory
        Returns: (folders_list, files_list)
        """
        if not os.path.exists(directory_path) or not os.path.isdir(directory_path):
            return [], []
        
        folders = []
        files = []
        
        for item_name in os.listdir(directory_path):
            item_path = os.path.join(directory_path, item_name)
            
            if os.path.isdir(item_path):
                folders.append(item_name)
            elif ImageManager.is_allowed_file(item_name):
                files.append(item_name)
        
        # Sort both lists
        folders.sort(key=str.lower)
        files.sort(key=str.lower)
        
        return folders, files
    
    @staticmethod
    def get_directory_tree(directory_path: str, max_depth: int = 3, current_depth: int = 0) -> dict:
        """
        Get recursive directory structure (tree view)
        
        Args:
            directory_path: Path to directory to scan
            max_depth: Maximum depth to traverse
            current_depth: Current recursion depth (used internally)
        
        Returns:
            Dict with directory structure
        """
        if current_depth >= max_depth:
            return {"name": os.path.basename(directory_path), "children": []}
        
        if not os.path.exists(directory_path) or not os.path.isdir(directory_path):
            return None
        
        folders, files = ImageManager.list_directory_contents(directory_path)
        
        children = []
        
        # Add subdirectories
        for folder in folders:
            folder_path = os.path.join(directory_path, folder)
            children.append(
                ImageManager.get_directory_tree(folder_path, max_depth, current_depth + 1)
            )
        
        # Add image files
        for file in files:
            children.append({
                "name": file,
                "type": "file"
            })
        
        return {
            "name": os.path.basename(directory_path) or "images",
            "children": children,
            "type": "folder"
        }

