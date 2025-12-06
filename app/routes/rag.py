from fastapi import APIRouter, UploadFile, File
from app.utils.upload_document_utils import process_single_file
from app.utils.chroma_utils import add_docs_to_chroma , setup_bm25_retriever
import os
 
router = APIRouter()

@router.post("/query")
async def rag_query(query: str):
    return {"answer": "Generated from RAG"}

pdf_folder="docs"


@router.post("/upload_and_vectorize")
async def upload_and_vectorize(file:UploadFile=File(...)):
    try:
        file_path=os.path.join(pdf_folder, file.filename)
        if os.path.exists(file_path):
            return {"detail":f"File {file.filename} already exists."}
        with open(file_path,"wb") as f:
            f.write(await file.read())
            
        chunks=process_single_file(file_path)
        add_docs_to_chroma(chunks)
        setup_bm25_retriever(chunks)
        return {"detail":f"Successfully vectorized {file.filename}","chunks_added":len(chunks),"docs":chunks}
    
        
    except Exception as e:
        return {"detail": "sorry something went wrong", "error": str(e)}
