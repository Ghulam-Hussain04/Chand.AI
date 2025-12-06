from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserCreate(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    is_active: int
    class Config:
        orm_mode = True

class ImageIn(BaseModel):
    tags: Optional[str] = None

class ImageOut(BaseModel):
    id: int
    filename: str
    relative_path: str
    tags: Optional[str]
    created_at: datetime
    class Config:
        orm_mode = True

# file tree schema (simple)
class FileNode(BaseModel):
    name: str
    type: str  # "file" or "folder"
    path: Optional[str] = None  # for files: relative path
    children: Optional[List["FileNode"]] = None

FileNode.update_forward_refs()
