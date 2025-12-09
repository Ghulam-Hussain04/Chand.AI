"""Pydantic schemas for request/response validation"""
from pydantic import BaseModel, EmailStr
from app.database import RoleEnum
from typing import Optional

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
