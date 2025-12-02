from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

# Configuration du pool de connexions optimisée pour Azure Standard S1
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=10,  # Connexions permanentes
    max_overflow=20,  # Connexions supplémentaires
    pool_timeout=30,
    pool_recycle=1800,  # Recycler après 30min
    pool_pre_ping=True,
    echo=False,
    connect_args={
        "connect_timeout": 10,
        "options": "-c statement_timeout=30000"  # 30s timeout
    }
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
