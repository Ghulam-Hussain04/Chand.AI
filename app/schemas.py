"""Pydantic schemas for request/response validation"""
from pydantic import BaseModel, EmailStr, Field
from app.db.database import RoleEnum
from typing import Optional, List, Dict, Any
from datetime import datetime

# ==================== User Schemas ====================

class UserBase(BaseModel):
    username: str
    email: EmailStr
    role: RoleEnum = RoleEnum.user

class UserRegister(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    username_or_email: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# ==================== Folder Schemas ====================

class FolderBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None

class FolderCreate(FolderBase):
    parent_id: Optional[int] = None

class FolderUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class FolderResponse(FolderBase):
    id: int
    parent_id: Optional[int]
    user_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class FolderWithContents(FolderResponse):
    subfolders: List['FolderResponse'] = []
    file_count: int = 0

# ==================== File Schemas ====================

class FileMetadataResponse(BaseModel):
    width: Optional[int] = None
    height: Optional[int] = None
    image_features: Optional[Dict[str, Any]] = None
    csv_columns: Optional[List[str]] = None
    csv_row_count: Optional[int] = None
    custom_metadata: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True

class FileBase(BaseModel):
    filename: str
    description: Optional[str] = None
    tags: Optional[List[str]] = None

class FileCreate(FileBase):
    folder_id: int

class FileResponse(FileBase):
    id: int
    original_filename: str
    folder_id: int
    storage_path: str
    file_type: str  # 'image' or 'csv'
    file_size: int
    user_id: int
    is_processed: bool
    created_at: datetime
    updated_at: datetime
    metadata: Optional[FileMetadataResponse] = None
    
    class Config:
        from_attributes = True

class FileUploadResponse(BaseModel):
    file_id: int
    filename: str
    original_filename: str
    folder_id: int
    status: str  # 'success' or 'error'
    message: Optional[str] = None
    file_size: int

class FileBatchUploadResponse(BaseModel):
    files: List[FileUploadResponse]
    total_uploaded: int
    total_failed: int
    total_size: int

# ==================== Image (Legacy) Schemas ====================

class ImageUploadResponse(BaseModel):
    id: int
    filename: str
    mission_name: str
    path: str
    user_id: int
    description: Optional[str] = None
    created_at: str
    
    class Config:
        from_attributes = True

class DirectoryItem(BaseModel):
    name: str
    type: str  # "folder" or "file"
    path: str

class DirectoryStructure(BaseModel):
    current_path: str
    items: List[DirectoryItem]

class ImageFileResponse(BaseModel):
    name: str
    url: str

class FolderContents(BaseModel):
    current_path: str
    folders: List[DirectoryItem]
    images: List[ImageFileResponse]

# ==================== File Update Schema ====================

class FileUpdateRequest(BaseModel):
    description: Optional[str] = None
    tags: Optional[List[str]] = None

# ==================== RAG Schemas ====================

class AskRequest(BaseModel):
    query: str
    session_id: Optional[int] = None
    file_id: Optional[int] = None  # Optional file scope for RAG
    folder_id: Optional[int] = None  # Optional folder scope for RAG

# Update forward references
FolderWithContents.model_rebuild()

