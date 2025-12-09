from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
from sqlalchemy import Column, Integer, String, Enum as SQLEnum, ForeignKey, DateTime, Boolean, Text
from app.config import settings
import enum
from datetime import datetime

# Create declarative base for models
Base = declarative_base()

# Enums
class RoleEnum(str, enum.Enum):
    user = "user"
    admin = "admin"

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
    
    # Relationships
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")

# Images model
class Image(Base):
    __tablename__ = "images"
    
    id = Column(Integer, primary_key=True, index=True)
    path = Column(String(500), nullable=False, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
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
    question = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    time = Column(DateTime, default=datetime.utcnow, nullable=False)
    inference_category = Column(SQLEnum(InferenceCategoryEnum), nullable=False)
    
    # Relationships
    chat_session = relationship("ChatSession", back_populates="chats")
    image = relationship("Image", back_populates="chats")

engine = create_async_engine(settings.DATABASE_URL)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

async def init_db():
    """Create all tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

