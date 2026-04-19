"""Database initialization script - Creates tables and default admin user"""
import asyncio
import os
from sqlalchemy import select
from app.db.database import (
    engine, Base, AsyncSessionLocal, User, RoleEnum, Folder, File, FileMetadata,
    ChatSession, Chat, InferenceCategoryEnum
)
from app.security import hash_password

async def init_db():
    """Initialize database and create all tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✓ Database tables created successfully")

async def create_default_admin():
    """Create default admin user if it doesn't exist"""
    # Get credentials from environment or use defaults
    admin_email = os.getenv("ADMIN_EMAIL", "hamdanvohra5676@gmail.com")
    admin_username = os.getenv("ADMIN_USERNAME", "admin")
    admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
    
    async with AsyncSessionLocal() as session:
        # Check if any admin user already exists
        result = await session.execute(
            select(User).where(User.role == RoleEnum.admin)
        )
        admin_user = result.scalar_one_or_none()
        
        if admin_user:
            print(f"✓ Admin user '{admin_user.email}' already exists")
            return admin_user
        
        # Create admin user
        hashed_password = hash_password(admin_password)
        admin_user = User(
            username=admin_username,
            email=admin_email,
            hashed_password=hashed_password,
            role=RoleEnum.admin
        )
        session.add(admin_user)
        await session.flush()  # Flush to get the admin_user.id
        
        # Create default root folder for admin
        default_folder = Folder(
            name="My Files",
            parent_id=None,  # Root folder
            user_id=admin_user.id,
            description="Default folder for storing images and CSV metadata"
        )
        session.add(default_folder)
        
        await session.commit()
        await session.refresh(admin_user)
        
        print(f"✓ Default admin user created:")
        print(f"  - Username: {admin_username}")
        print(f"  - Email: {admin_email}")
        print(f"  - Role: admin")
        print(f"  - Password: Set via ADMIN_PASSWORD environment (default: admin123)")
        print(f"✓ Default root folder 'My Files' created for admin")
        
        return admin_user

async def create_sample_data():
    """Create sample data for testing (optional)"""
    async with AsyncSessionLocal() as session:
        # Get admin user
        result = await session.execute(
            select(User).where(User.role == RoleEnum.admin)
        )
        admin_user = result.scalar_one_or_none()
        
        if not admin_user:
            print("⚠ Admin user not found, skipping sample data")
            return
        
        # Check if sample data already exists
        result = await session.execute(select(File).limit(1))
        if result.scalar_one_or_none():
            print("✓ Sample data already exists")
            return
        
        # Get admin's default folder
        result = await session.execute(
            select(Folder).where(
                (Folder.user_id == admin_user.id) & 
                (Folder.parent_id == None)
            )
        )
        admin_folder = result.scalar_one_or_none()
        
        if not admin_folder:
            print("⚠ Admin folder not found, skipping sample data")
            return
        
        # Create sample image file
        sample_file = File(
            filename="sample_soil_image.jpg",
            original_filename="sample_soil_image.jpg",
            folder_id=admin_folder.id,
            storage_path="files/1/1/sample_soil_image.jpg",
            file_type="image",
            file_size=102400,  # 100 KB
            user_id=admin_user.id,
            description="Sample soil image for testing RAG pipeline",
            tags=["sample", "test", "soil", "loamy"],
            is_processed=False
        )
        session.add(sample_file)
        await session.flush()
        
        # Create metadata for sample file
        sample_metadata = FileMetadata(
            file_id=sample_file.id,
            width=800,
            height=600,
            image_features={
                "soil_type": "loamy",
                "texture": "medium",
                "color": "brown",
                "moisture": "moderate",
                "organic_matter": "good"
            },
            custom_metadata={
                "sample_location": "mission_alpha",
                "collection_date": "2026-04-19"
            }
        )
        session.add(sample_metadata)
        
        # Create sample chat session
        sample_session = ChatSession(
            title="Soil Analysis - Sample Image",
            user_id=admin_user.id,
            is_deleted=False
        )
        session.add(sample_session)
        await session.flush()
        
        # Create sample chat linking to the file
        sample_chat = Chat(
            chat_session_id=sample_session.id,
            file_id=sample_file.id,
            question="What are the soil characteristics visible in this image?",
            response="Based on the image analysis, this appears to be a loamy soil with medium texture, good moisture content, and brown coloration indicating healthy organic matter content.",
            inference_category=InferenceCategoryEnum.soil_estimation
        )
        session.add(sample_chat)
        
        await session.commit()
        print("✓ Sample data created successfully")

async def main():
    """Main initialization function"""
    try:
        print("\n" + "=" * 70)
        print("TerraBot Backend - Database Initialization".center(70))
        print("=" * 70)
        
        print("\n📊 Step 1: Creating database tables...")
        await init_db()
        
        print("\n👤 Step 2: Creating default admin user...")
        await create_default_admin()
        
        print("\n📁 Step 3: Creating sample data...")
        await create_sample_data()
        
        print("\n" + "=" * 70)
        print("✅ Database initialization complete!".center(70))
        print("=" * 70)
        print("\n🚀 Next steps:")
        print("   1. Start the server: python -m uvicorn app.main:app --reload")
        print("   2. Login with admin credentials:")
        admin_email = os.getenv("ADMIN_EMAIL", "hamdanvohra5676@gmail.com")
        admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
        print(f"      Email: {admin_email}")
        print(f"      Password: {admin_password}")
        print("   3. Access API docs: http://localhost:8000/docs")
        print("\n" + "=" * 70 + "\n")
        
    except Exception as e:
        print(f"\n❌ Error during initialization: {str(e)}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == "__main__":
    asyncio.run(main())
