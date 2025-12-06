from fastapi import APIRouter

router = APIRouter()

@router.post("/")
async def create_chat(msg: str):
    return {"response": "saved"}
