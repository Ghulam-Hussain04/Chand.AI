from fastapi import FastAPI , UploadFile , File , HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/upload_and_vectorize")
async def upload_and_vectorize():
    try:
        return {"detail": f"✅ Successfully vectorized "}
    except Exception as e:
        return {"detail": "sorry something went wrong", "error": str(e)}
    
