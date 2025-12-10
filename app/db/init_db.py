"""Database initialization script"""
import asyncio
from sqlalchemy import select
from app.db.database import (
    engine, Base, AsyncSessionLocal, User, RoleEnum, 
    ChatSession, Chat, Image, InferenceCategoryEnum
)
from app.security import hash_password

async def init_db():
    """Initialize database and create tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✓ Database tables created")

async def create_admin_user():
    """Create initial admin user"""
    async with AsyncSessionLocal() as session:
        # Check if admin user already exists
        result = await session.execute(
            select(User).where(User.username == "adminterra")
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            print("✓ Admin user already exists")
            return
        
        # Create admin user
        admin_user = User(
            id=1,
            username="adminterra",
            email="k224318@nu.edu.pk",
            hashed_password=hash_password("terra1234"),
            role=RoleEnum.admin
        )
        
        session.add(admin_user)
        await session.commit()
        print("✓ Admin user created successfully")
        print(f"  Username: adminterra")
        print(f"  Email: k224318@nu.edu.pk")
        print(f"  Role: admin")

async def create_sample_data():
    """Create sample data for testing"""
    async with AsyncSessionLocal() as session:
        # Create sample image if not exists
        result = await session.execute(select(Image).limit(1))
        if result.scalar_one_or_none():
            print("✓ Sample data already exists")
            return
        
        # Create sample image
        sample_image = Image(
            path="/uploads/soil_sample_001.jpg",
            description="Sample soil image for testing"
        )
        session.add(sample_image)
        await session.commit()
        
        # Create sample chat session
        result = await session.execute(
            select(User).where(User.username == "adminterra")
        )
        admin_user = result.scalar_one_or_none()
        
        if admin_user:
            sample_session = ChatSession(
                title="Initial Soil Analysis",
                user_id=admin_user.id,
                is_deleted=False
            )
            session.add(sample_session)
            await session.commit()
            
            # Create sample chat
            sample_chat = Chat(
                chat_session_id=sample_session.id,
                image_id=sample_image.id,
                question="What type of soil is this?",
                response="This appears to be a loamy soil with good organic content.",
                inference_category=InferenceCategoryEnum.soil_estimation
            )
            session.add(sample_chat)
            await session.commit()
            
            print("✓ Sample data created successfully")

async def main():
    """Run database initialization"""
    print("=" * 50)
    print("Initializing database...")
    print("=" * 50)
    await init_db()
    await create_admin_user()
    await create_sample_data()
    print("=" * 50)
    print("✓ Database initialization complete!")
    print("=" * 50)

if __name__ == "__main__":
    asyncio.run(main())
