from fastapi import APIRouter, UploadFile, File,Depends
from app.utils.upload_document_utils import process_single_file
from app.utils.chroma_utils import add_docs_to_chroma , setup_bm25_retriever
from app.security import verify_token, verify_admin, TokenPayload
from app.utils.chroma_utils import list_all_chunks
from app.db.database import AsyncSession , get_db
from app.rag.pipeline import ask_llm
from app.schemas import AskRequest
from pydantic import BaseModel
from typing import Optional
import time
import os



 
router = APIRouter()



@router.post("/query")
async def rag_query(query: str):
    return {"answer": "Generated from RAG"}

pdf_folder="docs"


@router.post("/upload_and_vectorize")
async def upload_and_vectorize(file:UploadFile=File(...),current_user:TokenPayload=Depends(verify_admin)):
    print("In upload and vectorize")
    try:
        file_path=os.path.join(pdf_folder, file.filename)
        if os.path.exists(file_path):
            return {"detail":f"File {file.filename} already exists."}
        with open(file_path,"wb") as f:
            f.write(await file.read())
            
        chunks=process_single_file(file_path)
        print("before chroma")
        add_docs_to_chroma(chunks)  
        print("after chroma")
        setup_bm25_retriever(chunks)
        return {"detail":f"Successfully vectorized {file.filename}","chunks_added":len(chunks),"docs":chunks}
    
        
    except Exception as e:
        return {"detail": "sorry something went wrong", "error": str(e)}
    



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
