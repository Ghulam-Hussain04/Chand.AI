"""Script to reset database - drop and recreate"""
import asyncio
from sqlalchemy import text, create_engine, event
from app.config import settings

async def reset_db():
    """Reset the database"""
    # Use synchronous engine to drop database (async doesn't support this)
    db_url = settings.DATABASE_URL.replace("+asyncpg", "")
    
    # Connect to postgres default database
    engine = create_engine(db_url.replace("lunar_db", "postgres"), echo=False, isolation_level="AUTOCOMMIT")
    
    with engine.connect() as conn:
        # Terminate existing connections
        try:
            conn.execute(text("""
                SELECT pg_terminate_backend(pg_stat_activity.pid)
                FROM pg_stat_activity
                WHERE pg_stat_activity.datname = 'lunar_db'
                AND pid <> pg_backend_pid();
            """))
        except Exception as e:
            print(f"Note: {e}")
        
        # Drop database
        conn.execute(text("DROP DATABASE IF EXISTS lunar_db;"))
        
        # Create new database
        conn.execute(text("CREATE DATABASE lunar_db;"))
        
    engine.dispose()
    print("✓ Database dropped and recreated successfully")

if __name__ == "__main__":
    asyncio.run(reset_db())
