"""
RAG routes — chat with image analysis, document vectorisation, chunk inspection.

POST /rag/ask   — primary chat endpoint:
    1. If file_id provided → check LunarFeatures cache → run inference if needed
    2. Ask LLM with geo-features + RAG context
    3. Return LLM response

POST /rag/query        — lightweight RAG query without image inference
POST /rag/upload_and_vectorize — admin: add PDF to ChromaDB
GET  /rag/chunks       — admin: inspect ChromaDB chunks
"""
import os
import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel

from app.config import settings
from app.db.database import AsyncSession, get_db
from app.rag.pipeline import ask_llm
from app.schemas import AskRequest
from app.security import verify_token, verify_admin, TokenPayload
from app.services import FileService, FolderService
from app.services.specification_service import SpecificationService
from app.services.lunar_features_service import LunarFeaturesService
from app.services.inference_service import InferenceService
from app.utils.chroma_utils import add_docs_to_chroma, setup_bm25_retriever, list_all_chunks
from app.utils.upload_document_utils import process_single_file

router = APIRouter()

pdf_folder = "docs"


class RAGQueryResponse(BaseModel):
    answer: str
    source_files: Optional[list] = None
    confidence: Optional[float] = None


def get_current_user(token: TokenPayload = Depends(verify_token)) -> TokenPayload:
    if not token.user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return token


# ---------------------------------------------------------------------------
# Primary chat endpoint
# ---------------------------------------------------------------------------

@router.post("/ask")
async def ask(
    data: AskRequest,
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Chat with the lunar terrain analysis assistant.

    When `file_id` is provided:
    - Checks the LunarFeatures cache; if a record exists the pipeline is skipped.
    - Otherwise runs RF-DETR inference + geo-feature extraction, then caches the result.
    - The extracted features are injected into the LLM prompt for image-aware responses.

    When no `file_id` is provided the LLM answers from retrieved RAG documents only.
    """
    user_id = current_user.user_id
    start = time.time()

    features: Optional[dict] = None
    cached_feature_id: Optional[int] = None

    if data.file_id:
        # Verify file ownership
        file = await FileService.get_file(db, data.file_id, user_id)
        if not file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found or access denied",
            )
        if file.file_type != "image":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Lunar terrain analysis is only supported for image files",
            )

        # Check cache
        cached = await LunarFeaturesService.get_by_file_id(db, data.file_id)
        if cached:
            features = cached.features
            cached_feature_id = cached.id
        else:
            # Resolve mission specifications for this folder
            spec = await SpecificationService.get_or_create_default(db, file.folder_id)
            specs_dict = SpecificationService.to_dict(spec)

            # Build absolute image path
            image_path = os.path.join(settings.STORAGE_DIR, file.storage_path)

            try:
                features = await InferenceService.run_pipeline(image_path, specs_dict)
            except FileNotFoundError:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Image file not found on disk. Please re-upload.",
                )
            except RuntimeError as exc:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Inference pipeline failed: {exc}",
                )

            # Persist result so the pipeline is never run twice for the same image
            saved = await LunarFeaturesService.create(
                db=db,
                file_id=data.file_id,
                features=features,
                model_name=settings.INFERENCE_MODEL_NAME,
            )
            cached_feature_id = saved.id

    outcome = await ask_llm(
        query=data.query,
        db=db,
        session_id=data.session_id,
        user_id=user_id,
        features=features,
        file_id=data.file_id,
    )

    duration = round(time.time() - start, 2)
    return {
        "response": outcome["result"],
        "chat_id": outcome["chat_id"],
        "session_id": outcome["session_id"],
        "response_time_sec": duration,
        "inference_cached": cached_feature_id is not None,
    }


# ---------------------------------------------------------------------------
# Lightweight RAG-only query (no image inference)
# ---------------------------------------------------------------------------

@router.post("/query", response_model=RAGQueryResponse)
async def rag_query(
    request: AskRequest,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Query the RAG pipeline with optional file/folder scoping.

    Does NOT trigger image inference — use /ask for image-aware responses.
    """
    source_files = None

    if request.file_id:
        file = await FileService.get_file(db, request.file_id, current_user.user_id)
        if not file:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found or access denied")
        source_files = [file.original_filename]

    elif request.folder_id:
        folder = await FolderService.get_folder(db, request.folder_id, current_user.user_id)
        if not folder:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found or access denied")
        files = await FileService.get_folder_files(db, request.folder_id, current_user.user_id)
        source_files = [f.original_filename for f in files]

    outcome = await ask_llm(
        query=request.query,
        db=db,
        session_id=request.session_id,
        user_id=current_user.user_id,
    )

    return RAGQueryResponse(answer=outcome["result"], source_files=source_files)


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------

@router.post("/upload_and_vectorize")
async def upload_and_vectorize(
    file: UploadFile = File(...),
    current_user: TokenPayload = Depends(verify_admin),
):
    """Upload and vectorise a PDF document into ChromaDB. Admin only."""
    file_path = os.path.join(pdf_folder, file.filename)
    if os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File {file.filename} already exists.",
        )

    with open(file_path, "wb") as f:
        f.write(await file.read())

    chunks = process_single_file(file_path)
    add_docs_to_chroma(chunks)
    setup_bm25_retriever(chunks)

    return {"detail": f"Successfully vectorised {file.filename}", "chunks_added": len(chunks)}


@router.get("/chunks")
async def list_chunks_endpoint(current_user: TokenPayload = Depends(verify_admin)):
    """List all chunks stored in ChromaDB. Admin only."""
    try:
        chunks = list_all_chunks()
        return {"total_chunks": len(chunks), "chunks": chunks}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve chunks: {exc}",
        )


@router.get("/")
async def get_all_chunks():
    return list_all_chunks()
