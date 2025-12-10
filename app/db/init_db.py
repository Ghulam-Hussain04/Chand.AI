"""Database initialization script"""
import asyncio
from sqlalchemy import select, text
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
    
    # Add user_id column to images table if it doesn't exist (migration)
    await migrate_add_user_id_to_images()

# Helper function for migration
# We can use it for later updates as well in any tables
async def migrate_add_user_id_to_images():
    """Add user_id column to images table if it doesn't exist"""
    async with engine.begin() as conn:
        try:
            # Check if user_id column exists
            result = await conn.execute(
                text("""
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name='images' AND column_name='user_id'
                """)
            )
            column_exists = result.scalar() is not None
            
            if not column_exists:
                # Add user_id column (nullable for now to allow existing rows)
                await conn.execute(
                    text("""
                        ALTER TABLE images 
                        ADD COLUMN user_id INTEGER
                    """)
                )
                # Add foreign key constraint
                await conn.execute(
                    text("""
                        ALTER TABLE images 
                        ADD CONSTRAINT fk_images_user_id 
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    """)
                )
                print("Added user_id column to images table")
            else:
                print("user_id column already exists in images table")
        except Exception as e:
            print(f" Migration note: {str(e)}")

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
        # Get admin user first
        result = await session.execute(
            select(User).where(User.username == "adminterra")
        )
        admin_user = result.scalar_one_or_none()
        
        if not admin_user:
            print("⚠ Admin user not found, skipping sample data")
            return
        
        # Create sample image if not exists
        result = await session.execute(select(Image).limit(1))
        if result.scalar_one_or_none():
            print("✓ Sample data already exists")
            return
        
        # Create sample image with user_id
        sample_image = Image(
            path="mission_alpha/soil_sample_001.jpg",
            user_id=admin_user.id,
            description="Sample soil image for testing"
        )
        session.add(sample_image)
        await session.commit()
        await session.refresh(sample_image)
        
        # Create sample chat session
        sample_session = ChatSession(
            title="Initial Soil Analysis",
            user_id=admin_user.id,
            is_deleted=False
        )
        session.add(sample_session)
        await session.commit()
        await session.refresh(sample_session)
        
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
