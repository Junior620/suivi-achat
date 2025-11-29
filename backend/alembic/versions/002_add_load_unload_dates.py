"""add load and unload dates

Revision ID: 002
Revises: 001
Create Date: 2025-11-14 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Ajouter les colonnes load_date et unload_date
    op.add_column('deliveries', sa.Column('load_date', sa.Date(), nullable=True))
    op.add_column('deliveries', sa.Column('unload_date', sa.Date(), nullable=True))
    
    # Créer des index pour améliorer les performances
    op.create_index(op.f('ix_deliveries_load_date'), 'deliveries', ['load_date'])
    op.create_index(op.f('ix_deliveries_unload_date'), 'deliveries', ['unload_date'])
    
    # Initialiser les nouvelles colonnes avec la valeur du champ 'date' existant
    op.execute("""
        UPDATE deliveries 
        SET load_date = date, 
            unload_date = date
        WHERE load_date IS NULL
    """)


def downgrade() -> None:
    # Supprimer les index
    op.drop_index(op.f('ix_deliveries_unload_date'), table_name='deliveries')
    op.drop_index(op.f('ix_deliveries_load_date'), table_name='deliveries')
    
    # Supprimer les colonnes
    op.drop_column('deliveries', 'unload_date')
    op.drop_column('deliveries', 'load_date')
