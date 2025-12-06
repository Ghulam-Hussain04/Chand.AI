from fastapi import FastAPI , UploadFile , File , HTTPException
from fastapi.middleware.cors import CORSMiddleware
from utils.upload_document_utils import process_single_file
from utils.chroma_utils import add_docs_to_chroma , setup_bm25_retriever
import os


app = FastAPI()
pdf_folder="docs"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/upload_and_vectorize")
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