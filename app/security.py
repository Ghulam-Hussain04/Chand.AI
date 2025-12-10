from datetime import datetime, timedelta 
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
# from starlette.requests import HTTPAuthorizationCredentials as HTTPAuthCredentials
from app.config import settings
from typing import Optional

# Strong + modern hashing
pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto"
)

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXP_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

# HTTP Bearer security
security = HTTPBearer()

class TokenPayload:
    """JWT token payload model"""
    def __init__(self, sub: str, user_id: int, role: str, exp: datetime):
        self.sub = sub
        self.user_id = user_id
        self.role = role
        self.exp = exp

def verify_token(credentials = Depends(security)) -> TokenPayload:
    """Verify JWT token and return token payload"""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        username: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        role: str = payload.get("role")
        
        if username is None or user_id is None or role is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )
        
        return TokenPayload(
            sub=username,
            user_id=user_id,
            role=role,
            exp=datetime.fromtimestamp(payload.get("exp"))
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

def verify_admin(token: TokenPayload = Depends(verify_token)) -> TokenPayload:
    """Verify that user has admin role"""
    if token.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return token

