#!/usr/bin/env python3
"""
Script pour appliquer la migration 016 - Traçabilité et Blockchain
"""
import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv('backend/.env')

DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    print("❌ DATABASE_URL non trouvée dans backend/.env")
    sys.exit(1)

print(f"🔗 Connexion à la base de données...")
engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        print("✅ Connexion établie")
        
        # Vérifier si les tables existent déjà
        result = conn.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'traceability_records'
            );
        """))
        table_exists = result.scalar()
        
        if table_exists:
            print("⚠️  Les tables de traçabilité existent déjà")
            
            # Vérifier si les colonnes quality et vehicle existent
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'deliveries' 
                AND column_name IN ('quality', 'vehicle');
            """))
            existing_columns = [row[0] for row in result]
            
            if 'quality' not in existing_columns:
                print("➕ Ajout de la colonne 'quality' à deliveries...")
                conn.execute(text("""
                    ALTER TABLE deliveries 
                    ADD COLUMN quality VARCHAR;
                """))
                conn.execute(text("""
                    CREATE INDEX ix_deliveries_quality ON deliveries(quality);
                """))
                conn.commit()
                print("✅ Colonne 'quality' ajoutée")
            
            if 'vehicle' not in existing_columns:
                print("➕ Ajout de la colonne 'vehicle' à deliveries...")
                conn.execute(text("""
                    ALTER TABLE deliveries 
                    ADD COLUMN vehicle VARCHAR;
                """))
                conn.commit()
                print("✅ Colonne 'vehicle' ajoutée")
            
            # Synchroniser quality avec cocoa_quality
            print("🔄 Synchronisation quality = cocoa_quality...")
            conn.execute(text("""
                UPDATE deliveries 
                SET quality = cocoa_quality 
                WHERE quality IS NULL;
            """))
            conn.commit()
            print("✅ Synchronisation terminée")
            
        else:
            print("📦 Création des tables de traçabilité...")
            
            # Ajouter les colonnes à deliveries
            conn.execute(text("""
                ALTER TABLE deliveries 
                ADD COLUMN IF NOT EXISTS quality VARCHAR,
                ADD COLUMN IF NOT EXISTS vehicle VARCHAR;
            """))
            
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_deliveries_quality ON deliveries(quality);
            """))
            
            # Synchroniser quality avec cocoa_quality
            conn.execute(text("""
                UPDATE deliveries 
                SET quality = cocoa_quality 
                WHERE quality IS NULL;
            """))
            
            # Créer la table traceability_records
            conn.execute(text("""
                CREATE TABLE traceability_records (
                    id UUID PRIMARY KEY,
                    delivery_id UUID NOT NULL REFERENCES deliveries(id),
                    qr_code VARCHAR(255) NOT NULL UNIQUE,
                    qr_code_image TEXT,
                    blockchain_hash VARCHAR(64) NOT NULL UNIQUE,
                    previous_hash VARCHAR(64),
                    block_number INTEGER NOT NULL,
                    trace_data JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    verified_at TIMESTAMP
                );
            """))
            
            conn.execute(text("""
                CREATE INDEX ix_traceability_records_qr_code 
                ON traceability_records(qr_code);
            """))
            
            conn.execute(text("""
                CREATE INDEX ix_traceability_records_blockchain_hash 
                ON traceability_records(blockchain_hash);
            """))
            
            # Créer la table traceability_scans
            conn.execute(text("""
                CREATE TABLE traceability_scans (
                    id UUID PRIMARY KEY,
                    record_id UUID NOT NULL REFERENCES traceability_records(id),
                    scanned_by VARCHAR(255),
                    scan_location VARCHAR(255),
                    scan_type VARCHAR(50),
                    notes TEXT,
                    latitude VARCHAR(50),
                    longitude VARCHAR(50),
                    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            
            conn.commit()
            print("✅ Tables de traçabilité créées")
        
        # Mettre à jour la version alembic
        result = conn.execute(text("""
            SELECT version_num FROM alembic_version;
        """))
        current_version = result.scalar()
        
        if current_version != '016':
            print(f"🔄 Mise à jour de la version alembic: {current_version} -> 016")
            conn.execute(text("""
                UPDATE alembic_version SET version_num = '016';
            """))
            conn.commit()
            print("✅ Version alembic mise à jour")
        
        print("\n✅ Migration 016 appliquée avec succès!")
        print("\n📋 Résumé:")
        print("   - Tables de traçabilité créées/vérifiées")
        print("   - Colonnes quality et vehicle ajoutées à deliveries")
        print("   - Système blockchain prêt à l'emploi")
        print("   - QR codes automatiques pour chaque livraison")

except Exception as e:
    print(f"\n❌ Erreur lors de la migration: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
finally:
    engine.dispose()
