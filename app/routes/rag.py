from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from app.utils.upload_document_utils import process_single_file
from app.utils.chroma_utils import add_docs_to_chroma, setup_bm25_retriever
from app.security import verify_token, verify_admin, TokenPayload
from app.utils.chroma_utils import list_all_chunks
from app.db.database import AsyncSession, get_db
from app.rag.pipeline import ask_llm
from app.schemas import AskRequest
from app.services import FileService, FolderService
from pydantic import BaseModel
from typing import Optional
import time
import os

 
router = APIRouter(prefix="/rag", tags=["RAG"])

pdf_folder = "docs"

class RAGQueryResponse(BaseModel):
    answer: str
    source_files: Optional[list] = None
    confidence: Optional[float] = None

def get_current_user(token: TokenPayload = Depends(verify_token)) -> TokenPayload:
    """Get current authenticated user"""
    if not token.user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return token

@router.post("/query", response_model=RAGQueryResponse)
async def rag_query(
    request: AskRequest,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    """Query the RAG pipeline with optional file scoping
    
    Args:
        request: Query with optional file_id or folder_id for scoping
        current_user: Current authenticated user
        
    Returns:
        RAG response with answer and source files
    """
    try:
        # If file_id is specified, verify user has access and get file info
        source_files = None
        if request.file_id:
            file = await FileService.get_file(db, request.file_id, current_user.user_id)
            if not file:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="File not found or access denied"
                )
            source_files = [file.original_filename]
        
        # If folder_id is specified, verify user has access and get all files
        elif request.folder_id:
            folder = await FolderService.get_folder(db, request.folder_id, current_user.user_id)
            if not folder:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Folder not found or access denied"
                )
            
            files = await FileService.get_folder_files(db, request.folder_id, current_user.user_id)
            source_files = [f.original_filename for f in files]
        
        # Call RAG pipeline (UNTOUCHED core logic)
        # Note: In future, the ask_llm function can be enhanced to filter by source_files
        answer = await ask_llm(request.query)
        
        return RAGQueryResponse(
            answer=answer,
            source_files=source_files,
            confidence=None
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RAG query failed: {str(e)}"
        )

@router.post("/upload_and_vectorize")
async def upload_and_vectorize(
    file: UploadFile = File(...),
    current_user: TokenPayload = Depends(verify_admin)
):
    """Upload and vectorize document for RAG
    
    ADMIN ONLY - Adds document to ChromaDB vector store
    
    Args:
        file: Document file to vectorize
        current_user: Must be admin
        
    Returns:
        Vectorization result
    """
    print("In upload and vectorize")
    try:
        file_path = os.path.join(pdf_folder, file.filename)
        if os.path.exists(file_path):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File {file.filename} already exists."
            )
        
        with open(file_path, "wb") as f:
            f.write(await file.read())
            
        chunks = process_single_file(file_path)
        print("before chroma")
        add_docs_to_chroma(chunks)  
        print("after chroma")
        setup_bm25_retriever(chunks)
        
        return {
            "detail": f"Successfully vectorized {file.filename}",
            "chunks_added": len(chunks),
            "docs": chunks
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Vectorization failed: {str(e)}"
        )

@router.get("/chunks")
async def list_chunks(current_user: TokenPayload = Depends(verify_admin)):
    """List all chunks in ChromaDB
    
    ADMIN ONLY
    
    Returns:
        List of all vector chunks
    """
    try:
        chunks = list_all_chunks()
        return {"total_chunks": len(chunks), "chunks": chunks}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve chunks: {str(e)}"
        )
    



@router.post("/ask")
async def ask(data:AskRequest, current_user: TokenPayload = Depends(verify_token), db: AsyncSession = Depends(get_db)):
    print("IN ASK")
    user_id=current_user.user_id
    start=time.time()
    outcome=await ask_llm( 
        query=data.query,
        db=db,
        session_id=data.session_id,
        user_id=current_user.user_id)
    duration=round(time.time()-start,2)
    print("ask response time:",duration)
    return {"response":outcome.get("result"),"chat_id":outcome.get("chat_id") , "session_id":outcome.get("session_id"), "response_time_sec":duration}

@router.get("/")
async def get_all_chunks(): 
    return list_all_chunks()
