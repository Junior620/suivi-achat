-- Migration 016: Traçabilité et Blockchain
-- Date: 2025-12-01

-- Ajouter les colonnes manquantes à deliveries
ALTER TABLE deliveries 
ADD COLUMN IF NOT EXISTS quality VARCHAR,
ADD COLUMN IF NOT EXISTS vehicle VARCHAR;

CREATE INDEX IF NOT EXISTS ix_deliveries_quality ON deliveries(quality);

-- Synchroniser quality avec cocoa_quality
UPDATE deliveries 
SET quality = cocoa_quality 
WHERE quality IS NULL;

-- Créer la table traceability_records
CREATE TABLE IF NOT EXISTS traceability_records (
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

CREATE INDEX IF NOT EXISTS ix_traceability_records_qr_code 
ON traceability_records(qr_code);

CREATE INDEX IF NOT EXISTS ix_traceability_records_blockchain_hash 
ON traceability_records(blockchain_hash);

-- Créer la table traceability_scans
CREATE TABLE IF NOT EXISTS traceability_scans (
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

-- Mettre à jour la version alembic
UPDATE alembic_version SET version_num = '016';
