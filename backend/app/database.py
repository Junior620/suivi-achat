from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings
import logging
import os

logger = logging.getLogger(__name__)

# Force UTF-8 encoding for Windows paths with special characters
os.environ.setdefault('PYTHONIOENCODING', 'utf-8')
os.environ.setdefault('PGCLIENTENCODING', 'utf8')

# Create engine with lazy connection
logger.info(f"Configuring database engine...")
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=False,
    connect_args={"client_encoding": "utf8", "connect_timeout": 30}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
