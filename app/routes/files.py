from fastapi import APIRouter, UploadFile, File
import os
from app.config import settings

router = APIRouter()

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    os.makedirs(settings.STORAGE_PATH, exist_ok=True)
    path = os.path.join(settings.STORAGE_PATH, file.filename)

    with open(path, "wb") as f:
        f.write(await file.read())

    return {"filename": file.filename}
