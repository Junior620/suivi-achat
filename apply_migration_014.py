"""
Script pour appliquer manuellement la migration 014 - Sessions
"""
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv('backend/.env')

DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

migration_sql = """
-- Créer la table sessions
CREATE TABLE IF NOT EXISTS sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    user_agent TEXT,
    ip_address TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_activity TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Créer les index
CREATE INDEX IF NOT EXISTS ix_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS ix_sessions_session_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS ix_sessions_is_active ON sessions(is_active);

-- Mettre à jour la version alembic
INSERT INTO alembic_version (version_num) VALUES ('014_create_sessions')
ON CONFLICT (version_num) DO NOTHING;
"""

try:
    with engine.connect() as conn:
        # Exécuter la migration
        conn.execute(text(migration_sql))
        conn.commit()
        print("✅ Migration 014 appliquée avec succès !")
        print("   - Table sessions créée")
        print("   - Index créés")
        
except Exception as e:
    print(f"❌ Erreur lors de la migration : {e}")
    raise

finally:
    engine.dispose()
