from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.security import create_access_token

router = APIRouter()

@router.post("/login")
async def login():
    token = create_access_token({"sub": "user"})
    return {"access_token": token}
