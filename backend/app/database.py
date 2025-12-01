from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

# Configuration du pool de connexions pour production
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=10,  # Nombre de connexions permanentes
    max_overflow=20,  # Connexions supplémentaires autorisées
    pool_timeout=60,  # Timeout en secondes
    pool_recycle=3600,  # Recycler les connexions après 1h
    pool_pre_ping=True  # Vérifier la connexion avant utilisation
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
