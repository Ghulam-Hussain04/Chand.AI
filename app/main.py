from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from contextlib import asynccontextmanager
import asyncio

from app.routes import auth, chats, files, rag, folders, upload, admin
from app.db.init_db import init_db, create_default_admin

@asynccontextmanager
async def lifespan(_: FastAPI):
    await init_db()
    await create_default_admin()
    # Warm up the inference model in a background thread so the first
    # request does not pay the cold-start cost.
    from app.inference.model import preload_model
    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, preload_model)
    yield


app = FastAPI(
    title="TerraBot Backend API",
    description="Modular RAG + File Management Backend with Lunar Terrain Inference",
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(folders.router, prefix="/api/folders", tags=["Folders"])
app.include_router(upload.router, prefix="/api/files", tags=["Files"])
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


    
