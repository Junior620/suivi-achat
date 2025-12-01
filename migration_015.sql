-- Migration 015: Ajout de la table payments
-- Date: 2024-12-01

-- Créer les types enum
CREATE TYPE paymentmethod AS ENUM ('cash', 'virement', 'cheque');
CREATE TYPE paymentstatus AS ENUM ('pending', 'completed', 'cancelled');

-- Créer la table payments
CREATE TABLE payments (
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
);

-- Créer les index
CREATE INDEX ix_payments_planter_id ON payments(planter_id);
CREATE INDEX ix_payments_date_paiement ON payments(date_paiement);
CREATE INDEX ix_payments_methode ON payments(methode);
CREATE INDEX ix_payments_statut ON payments(statut);

-- Mettre à jour la version
INSERT INTO alembic_version (version_num) VALUES ('015') ON CONFLICT DO NOTHING;
