"""add quantity loaded

Revision ID: 005
Revises: 004
Create Date: 2025-11-18 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Ajouter la colonne quantity_loaded_kg
    op.add_column('deliveries', sa.Column('quantity_loaded_kg', sa.Numeric(12, 2), nullable=True))
    
    # Copier les valeurs de quantity_kg vers quantity_loaded_kg pour les données existantes
    # (on suppose que chargé = déchargé pour les anciennes données)
    op.execute("""
        UPDATE deliveries 
        SET quantity_loaded_kg = quantity_kg
        WHERE quantity_loaded_kg IS NULL
    """)
    
    # Rendre la colonne non-nullable après avoir rempli les valeurs
    op.alter_column('deliveries', 'quantity_loaded_kg', nullable=False)


def downgrade() -> None:
    op.drop_column('deliveries', 'quantity_loaded_kg')
