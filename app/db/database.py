from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
from sqlalchemy import Column, Integer, String, Enum as SQLEnum, ForeignKey, DateTime, Boolean, Text, JSON, Float
from app.config import settings
import enum
from datetime import datetime

# Create declarative base for models
Base = declarative_base()

# Enums
class RoleEnum(str, enum.Enum):
    admin = "admin"
    researcher = "researcher"
    user = "user"

class InferenceCategoryEnum(str, enum.Enum):
    soil_estimation = "Soil Estimation"
    lunar_terrain_detection = "Lunar Terrain Detection"

# User model
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(255), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SQLEnum(RoleEnum), default=RoleEnum.user, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    folders = relationship("Folder", back_populates="user", cascade="all, delete-orphan")
    files = relationship("File", back_populates="user", cascade="all, delete-orphan")

# Images model
class Image(Base):
    __tablename__ = "images"
    
    id = Column(Integer, primary_key=True, index=True)
    path = Column(String(500), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", backref="images")
    chats = relationship("Chat", back_populates="image")

# Chat_Sessions model
class ChatSession(Base):
    __tablename__ = "chat_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="chat_sessions")
    chats = relationship("Chat", back_populates="chat_session", cascade="all, delete-orphan")

# Chat model
class Chat(Base):
    __tablename__ = "chats"
    
    id = Column(Integer, primary_key=True, index=True)
    chat_session_id = Column(Integer, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    image_id = Column(Integer, ForeignKey("images.id", ondelete="SET NULL"), nullable=True)
    file_id = Column(Integer, ForeignKey("files.id", ondelete="SET NULL"), nullable=True)
    question = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    time = Column(DateTime, default=datetime.utcnow, nullable=False)
    inference_category = Column(SQLEnum(InferenceCategoryEnum), nullable=False)
    
    # Relationships
    chat_session = relationship("ChatSession", back_populates="chats")
    image = relationship("Image", back_populates="chats")
    file = relationship("File", back_populates="chats")

# Folder model - Hierarchical folder structure
class Folder(Base):
    __tablename__ = "folders"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    parent_id = Column(Integer, ForeignKey("folders.id", ondelete="CASCADE"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="folders")
    parent = relationship("Folder", remote_side=[id], backref="subfolders")
    files = relationship("File", back_populates="folder", cascade="all, delete-orphan")
    shared_folders = relationship("SharedFolder", back_populates="folder", cascade="all, delete-orphan")

# File model - Store image/csv metadata
class File(Base):
    __tablename__ = "files"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(500), nullable=False)
    original_filename = Column(String(500), nullable=False)
    folder_id = Column(Integer, ForeignKey("folders.id", ondelete="CASCADE"), nullable=False)
    storage_path = Column(String(1000), nullable=False)
    file_type = Column(String(50), nullable=False)  # 'image' or 'csv'
    file_size = Column(Integer, nullable=False)  # in bytes
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    description = Column(Text, nullable=True)
    tags = Column(JSON, nullable=True)  # List of tags
    is_processed = Column(Boolean, default=False, nullable=False)  # For image processing status
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    folder = relationship("Folder", back_populates="files")
    user = relationship("User", back_populates="files")
    file_metadata = relationship("FileMetadata", back_populates="file", uselist=False, cascade="all, delete-orphan")
    chats = relationship("Chat", back_populates="file")

# FileMetadata model - Extensible metadata for files
class FileMetadata(Base):
    __tablename__ = "file_metadata"
    
    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(Integer, ForeignKey("files.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    # Image-specific metadata
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    image_features = Column(JSON, nullable=True)  # LLM-extracted features
    
    # CSV metadata
    csv_columns = Column(JSON, nullable=True)  # Column names from CSV
    csv_row_count = Column(Integer, nullable=True)
    
    # Custom extensible metadata
    custom_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    file = relationship("File", back_populates="file_metadata")

# SharedFolder model - For future multi-user sharing
class SharedFolder(Base):
    __tablename__ = "shared_folders"
    
    id = Column(Integer, primary_key=True, index=True)
    folder_id = Column(Integer, ForeignKey("folders.id", ondelete="CASCADE"), nullable=False)
    shared_with_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    permission_level = Column(String(50), nullable=False)  # 'view', 'edit', 'admin'
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    folder = relationship("Folder", back_populates="shared_folders")
    shared_with_user = relationship("User", backref="shared_folders")

engine = create_async_engine(settings.DATABASE_URL)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

async def init_db():
    """Create all tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

