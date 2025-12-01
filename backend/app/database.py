from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

# Configuration du pool de connexions pour production
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=20,  # Nombre de connexions permanentes (augmenté)
    max_overflow=40,  # Connexions supplémentaires autorisées (augmenté)
    pool_timeout=30,  # Timeout en secondes (réduit)
    pool_recycle=1800,  # Recycler les connexions après 30min
    pool_pre_ping=True,  # Vérifier la connexion avant utilisation
    echo_pool=False  # Désactiver les logs du pool
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
