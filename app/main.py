from fastapi import FastAPI , UploadFile , File , HTTPException
from fastapi.middleware.cors import CORSMiddleware
import asyncpg
import asyncio


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
    

async def test():
    conn = await asyncpg.connect("postgresql://postgres:1234@localhost:5432/mydb")
    print("✅ Connected successfully!")
    await conn.close()

asyncio.run(test())