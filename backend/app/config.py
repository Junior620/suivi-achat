from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    DATABASE_URL: str
    # Support both JWT_SECRET and SECRET_KEY for compatibility
    SECRET_KEY: str = None
    JWT_SECRET: str = None
    ALGORITHM: str = "HS256"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Use SECRET_KEY if JWT_SECRET is not set
        if not self.JWT_SECRET and self.SECRET_KEY:
            self.JWT_SECRET = self.SECRET_KEY
        # Use ALGORITHM if JWT_ALGORITHM is not set
        if not self.JWT_ALGORITHM and self.ALGORITHM:
            self.JWT_ALGORITHM = self.ALGORITHM
    
    @property
    def cors_origins_list(self) -> List[str]:
        if self.CORS_ORIGINS == "*":
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "allow"

settings = Settings()
