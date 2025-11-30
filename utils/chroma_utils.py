from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain.schema import Document
from langchain_community.retrievers import BM25Retriever
from fastapi.responses import JSONResponse
import os , shutil



embeddings=HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
persist_dir="./chroma_db"
bm25_retriever=None

def initialize_chroma():
    return Chroma(persist_directory=persist_dir, embedding_function=embeddings)

def add_docs_to_chroma(docs:list[Document]):
    vectordb=initialize_chroma()
    batch_size=5000
    for i in range(0,len(docs),batch_size):
        batch=docs[i:i+batch_size]
        vectordb.add_documents(batch)
        
def setup_bm25_retriever(docs:list[Document]):
    global bm25_retriever
    bm25_retriever=BM25Retriever.from_documents(docs)
    bm25_retriever.k=3
    
def clear_chroma():
    if os.path.exists(persist_dir):
        shutil.rmtree(persist_dir)
        
def list_all_chunks():
    vectordb=initialize_chroma()
    results=vectordb.get(include=["metadatas","documents"])
    
    print(f"Total chunks in chroma: {len(results['documents'])}\n")
    
    chunks=[]
    for i, (doc,meta) in enumerate(zip(results['documents'] , results['metadatas'])):
        chunks.append({
            "chunk": f"Chunk {i+1}",
            "content":doc,
            "metadata":meta
        })
        
    return JSONResponse(content={"total_chunks":len(chunks), "chunks":chunks})
 
    

    
