from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str
    JWT_EXP_MINUTES: int
    STORAGE_DIR: str
    GROQ_API_KEY: str

    @property
    def STORAGE_PATH(self) -> str:
        """Get the full storage path"""
        return os.path.join(os.getcwd(), self.STORAGE_DIR)

    class Config:
        env_file = ".env"

settings = Settings()

# from dotenv import load_dotenv
# import os

# load_dotenv()

# DATABASE_URL = os.getenv("DATABASE_URL")
# SECRET_KEY = os.getenv("SECRET_KEY") or "dev-secret"
# ALGORITHM = os.getenv("ALGORITHM") or "HS256"
# ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES") or 60)
# STORAGE_DIR = os.getenv("STORAGE_DIR") or "./storage"
