"""
Script de migration automatique au démarrage
"""
import logging
from sqlalchemy import text
from sqlalchemy.exc import ProgrammingError, OperationalError

logger = logging.getLogger(__name__)


def run_startup_migrations(engine):
    """Exécute les migrations nécessaires au démarrage"""
    
    migrations = [
        # Ajouter is_active à users
        """
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='users' AND column_name='is_active') THEN
                ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE NOT NULL;
            END IF;
        END $$;
        """,
        # Ajouter zone à users
        """
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='users' AND column_name='zone') THEN
                ALTER TABLE users ADD COLUMN zone VARCHAR(100);
            END IF;
        END $$;
        """,
        # Ajouter created_by à users
        """
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='users' AND column_name='created_by') THEN
                ALTER TABLE users ADD COLUMN created_by UUID;
            END IF;
        END $$;
        """,
        # Ajouter deactivated_at à users
        """
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='users' AND column_name='deactivated_at') THEN
                ALTER TABLE users ADD COLUMN deactivated_at TIMESTAMP;
            END IF;
        END $$;
        """,
        # Ajouter deactivated_by à users
        """
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='users' AND column_name='deactivated_by') THEN
                ALTER TABLE users ADD COLUMN deactivated_by UUID;
            END IF;
        END $$;
        """,
        # Créer la table sessions
        """
        CREATE TABLE IF NOT EXISTS sessions (
            id BIGSERIAL PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            session_token VARCHAR NOT NULL UNIQUE,
            user_agent VARCHAR,
            ip_address VARCHAR,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL,
            last_activity TIMESTAMP DEFAULT NOW() NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            is_active BOOLEAN DEFAULT TRUE NOT NULL
        );
        """,
        # Index pour sessions
        "CREATE INDEX IF NOT EXISTS ix_sessions_user_id ON sessions(user_id);",
        "CREATE INDEX IF NOT EXISTS ix_sessions_session_token ON sessions(session_token);",
        "CREATE INDEX IF NOT EXISTS ix_sessions_is_active ON sessions(is_active);",
        # Ajouter reply_to_id à messages
        """
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='messages' AND column_name='reply_to_id') THEN
                ALTER TABLE messages ADD COLUMN reply_to_id UUID REFERENCES messages(id);
            END IF;
        END $$;
        """,
        # Ajouter edited_at à messages
        """
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='messages' AND column_name='edited_at') THEN
                ALTER TABLE messages ADD COLUMN edited_at TIMESTAMP WITH TIME ZONE;
            END IF;
        END $$;
        """,
        # Ajouter deleted_at à messages
        """
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='messages' AND column_name='deleted_at') THEN
                ALTER TABLE messages ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
            END IF;
        END $$;
        """,
        # ========== MIGRATIONS PLANTERS (Validation + Géolocalisation) ==========
        # Ajouter latitude à planters
        """
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='planters' AND column_name='latitude') THEN
                ALTER TABLE planters ADD COLUMN latitude DOUBLE PRECISION;
            END IF;
        END $$;
        """,
        # Ajouter longitude à planters
        """
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='planters' AND column_name='longitude') THEN
                ALTER TABLE planters ADD COLUMN longitude DOUBLE PRECISION;
            END IF;
        END $$;
        """,
        # Ajouter validation_status à planters (default validated pour les existants)
        """
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='planters' AND column_name='validation_status') THEN
                ALTER TABLE planters ADD COLUMN validation_status VARCHAR(20) DEFAULT 'validated' NOT NULL;
            END IF;
        END $$;
        """,
        # Ajouter validated_by à planters
        """
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='planters' AND column_name='validated_by') THEN
                ALTER TABLE planters ADD COLUMN validated_by UUID;
            END IF;
        END $$;
        """,
        # Ajouter validated_at à planters
        """
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='planters' AND column_name='validated_at') THEN
                ALTER TABLE planters ADD COLUMN validated_at TIMESTAMP;
            END IF;
        END $$;
        """,
        # Ajouter rejection_reason à planters
        """
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='planters' AND column_name='rejection_reason') THEN
                ALTER TABLE planters ADD COLUMN rejection_reason VARCHAR(500);
            END IF;
        END $$;
        """,
        # Ajouter created_by à planters
        """
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='planters' AND column_name='created_by') THEN
                ALTER TABLE planters ADD COLUMN created_by UUID;
            END IF;
        END $$;
        """,
    ]
    
    with engine.connect() as conn:
        for i, migration in enumerate(migrations):
            try:
                conn.execute(text(migration))
                conn.commit()
                logger.info(f"Migration {i+1}/{len(migrations)} exécutée avec succès")
            except (ProgrammingError, OperationalError) as e:
                logger.warning(f"Migration {i+1} ignorée (peut-être déjà appliquée): {e}")
                conn.rollback()
            except Exception as e:
                logger.error(f"Erreur migration {i+1}: {e}")
                conn.rollback()
    
    logger.info("Migrations de démarrage terminées")
