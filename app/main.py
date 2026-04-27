from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from app.routes import auth, chats, files, rag, folders, upload, admin

app = FastAPI(
    title="TerraBot Backend API",
    description="Modular RAG + File Management Backend",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers - Auth first, then core functionality
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(folders.router,prefix="/api/folders", tags=["Folders"])
app.include_router(upload.router,prefix="/api/files", tags=["Files"])
app.include_router(chats.router, prefix="/chats", tags=["Chats"])
app.include_router(rag.router, prefix="/rag", tags=["RAG"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])

@app.get("/", tags=["Health"])
async def root():
    """API health check"""
    return {
        "message": "TerraBot Backend API v2.0.0 Running",
        "features": ["File Management", "RAG Pipeline", "Image Processing"]
    }

@app.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "version": "2.0.0"
    }


    
