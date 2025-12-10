"""Pydantic schemas for request/response validation"""
from pydantic import BaseModel, EmailStr
from app.db.database import RoleEnum
from typing import Optional, List
from datetime import datetime

# User schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr
    role: RoleEnum = RoleEnum.user

class UserRegister(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    
    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    username_or_email: str  # Can be username or email
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Image schemas
class ImageUploadResponse(BaseModel):
    filename: str
    mission_name: str
    path: str
    created_at: str

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

