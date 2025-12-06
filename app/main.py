from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from app.routes import auth, chats, files, rag

app = FastAPI(title="TerraBot API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(chats.router, prefix="/chats", tags=["Chats"])
app.include_router(files.router, prefix="/files", tags=["Files"])
app.include_router(rag.router, prefix="/rag", tags=["RAG"])


    
