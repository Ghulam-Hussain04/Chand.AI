"""Pydantic schemas for request/response validation"""
from pydantic import BaseModel, EmailStr, Field
from app.db.database import RoleEnum
from typing import Optional, List, Dict, Any
from datetime import datetime

# ==================== Project Specification Schemas ====================

class ProjectSpecificationBase(BaseModel):
    mission_name: str = "Chang3"
    meters_per_pixel: float = Field(default=0.5, gt=0)
    camera_angle_deg: float = Field(default=15.0, ge=0, le=90)
    camera_resolution_w: int = Field(default=1024, gt=0)
    camera_resolution_h: int = Field(default=1024, gt=0)
    camera_fov_deg: float = Field(default=45.0, ge=0, le=360)
    rover_height_m: float = Field(default=1.5, gt=0)
    notes: Optional[str] = None

class ProjectSpecificationCreate(ProjectSpecificationBase):
    pass

class ProjectSpecificationUpdate(BaseModel):
    mission_name: Optional[str] = None
    meters_per_pixel: Optional[float] = Field(default=None, gt=0)
    camera_angle_deg: Optional[float] = Field(default=None, ge=0, le=90)
    camera_resolution_w: Optional[int] = Field(default=None, gt=0)
    camera_resolution_h: Optional[int] = Field(default=None, gt=0)
    camera_fov_deg: Optional[float] = Field(default=None, ge=0, le=360)
    rover_height_m: Optional[float] = Field(default=None, gt=0)
    notes: Optional[str] = None

class ProjectSpecificationResponse(ProjectSpecificationBase):
    id: int
    folder_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ==================== Lunar Features Schemas ====================

class LunarFeaturesResponse(BaseModel):
    id: int
    file_id: int
    features: Dict[str, Any]
    craters_count: int
    rocks_count: int
    boulders_count: int
    rocky_regions_count: int
    model_name: Optional[str] = None
    processed_at: datetime

    class Config:
        from_attributes = True

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
    specifications: Optional[ProjectSpecificationCreate] = None  # None → default Chang3 specs

class FolderUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class FolderResponse(FolderBase):
    id: int
    parent_id: Optional[int]
    user_id: int
    created_at: datetime
    updated_at: datetime
    access_level: Optional[str] = None  # 'owner', 'write', 'read'

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
    file_id: Optional[int] = None    # Triggers inference pipeline; result cached in LunarFeatures
    folder_id: Optional[int] = None  # Optional folder scope for RAG document retrieval

# ==================== Folder Access Schemas ====================

class FolderAccessGrant(BaseModel):
    user_id: int
    permission_level: str  # 'read' or 'write'

class FolderAccessEntry(BaseModel):
    user_id: int
    username: str
    email: str
    permission_level: str
    granted_at: datetime

class AdminFolderItem(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    owner_id: int
    owner_username: str
    file_count: int
    created_at: datetime
    access_entries: List[FolderAccessEntry] = []

# Update forward references
FolderWithContents.model_rebuild()

