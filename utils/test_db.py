import asyncio
import asyncpg
from dotenv import load_dotenv
import os

# Load environment variables from .env
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

async def test_connection():
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        print(" Connected successfully to PostgreSQL!")
        # Optional: check tables
        rows = await conn.fetch("SELECT tablename FROM pg_tables WHERE schemaname='public';")
        print("Tables in DB:", [row['tablename'] for row in rows])
        await conn.close()
    except Exception as e:
        print(" Connection failed:", e)

if __name__ == "__main__":
    asyncio.run(test_connection())
