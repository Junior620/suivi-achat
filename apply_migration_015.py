#!/usr/bin/env python3
"""
Script pour appliquer la migration 015 - Ajout de la table payments
"""

import sys
import os
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv('backend/.env')

# Ajouter le répertoire backend au path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy import create_engine, text
from backend.app.config import settings

def apply_migration():
    """Applique la migration 015 pour ajouter la table payments"""
    
    print("🔄 Connexion à la base de données...")
    db_url = settings.DATABASE_URL or os.getenv('DATABASE_URL')
    if not db_url:
        print("❌ DATABASE_URL non définie!")
        sys.exit(1)
    engine = create_engine(db_url)
    
    try:
        with engine.connect() as conn:
            print("\n📋 Application de la migration 015...")
            
            # Créer les types enum
            print("  - Création des types enum...")
            conn.execute(text("""
                DO $$ BEGIN
                    CREATE TYPE paymentmethod AS ENUM ('cash', 'virement', 'cheque');
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$;
            """))
            
            conn.execute(text("""
                DO $$ BEGIN
                    CREATE TYPE paymentstatus AS ENUM ('pending', 'completed', 'cancelled');
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$;
            """))
            
            # Créer la table payments
            print("  - Création de la table payments...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS payments (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    planter_id UUID NOT NULL REFERENCES planters(id) ON DELETE CASCADE,
                    delivery_id UUID REFERENCES deliveries(id) ON DELETE SET NULL,
                    montant FLOAT NOT NULL,
                    methode paymentmethod DEFAULT 'virement',
                    statut paymentstatus DEFAULT 'completed',
                    date_paiement DATE NOT NULL,
                    reference VARCHAR,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_by UUID REFERENCES users(id) ON DELETE SET NULL
                )
            """))
            
            # Créer les index
            print("  - Création des index...")
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_payments_planter_id ON payments(planter_id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_payments_date_paiement ON payments(date_paiement)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_payments_methode ON payments(methode)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_payments_statut ON payments(statut)"))
            
            # Mettre à jour la version d'Alembic
            print("  - Mise à jour de la version Alembic...")
            conn.execute(text("""
                INSERT INTO alembic_version (version_num) 
                VALUES ('015')
                ON CONFLICT (version_num) DO NOTHING
            """))
            
            conn.commit()
            
            print("\n✅ Migration 015 appliquée avec succès!")
            print("\n📊 Vérification de la table...")
            
            # Vérifier que la table existe
            result = conn.execute(text("""
                SELECT COUNT(*) as count 
                FROM information_schema.tables 
                WHERE table_name = 'payments'
            """))
            
            count = result.fetchone()[0]
            if count > 0:
                print("  ✓ Table 'payments' créée")
                
                # Afficher la structure
                result = conn.execute(text("""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = 'payments'
                    ORDER BY ordinal_position
                """))
                
                print("\n  Structure de la table:")
                for row in result:
                    print(f"    - {row[0]}: {row[1]}")
            else:
                print("  ⚠️ La table 'payments' n'a pas été créée")
                
    except Exception as e:
        print(f"\n❌ Erreur lors de l'application de la migration: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        engine.dispose()

if __name__ == "__main__":
    print("=" * 60)
    print("  Migration 015 - Ajout du système de paiements")
    print("=" * 60)
    apply_migration()
    print("\n" + "=" * 60)
    print("  Migration terminée!")
    print("=" * 60)
