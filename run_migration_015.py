#!/usr/bin/env python3
import os
from sqlalchemy import create_engine, text

# Récupérer l'URL de la base de données
DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    print("❌ DATABASE_URL non définie!")
    exit(1)

print("🔄 Connexion à la base de données...")
engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        print("📋 Application de la migration 015...")
        
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
        
        conn.commit()
        
        print("\n✅ Migration 015 appliquée avec succès!")
        
except Exception as e:
    print(f"\n❌ Erreur: {e}")
    exit(1)
finally:
    engine.dispose()
