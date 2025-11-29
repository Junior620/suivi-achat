"""refactor limites production

Revision ID: 004
Revises: 003
Create Date: 2025-11-14 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Ajouter superficie_hectares aux planteurs
    op.add_column('planters', sa.Column('superficie_hectares', sa.Numeric(10, 2), nullable=True))
    
    # Renommer la colonne dans chef_planteurs
    op.alter_column('chef_planteurs', 'superficie_hectares',
                    new_column_name='quantite_max_kg',
                    type_=sa.Numeric(12, 2),
                    nullable=False)
    
    # Convertir les anciennes valeurs (superficie * 1000 = quantité)
    op.execute("""
        UPDATE chef_planteurs 
        SET quantite_max_kg = quantite_max_kg * 1000
    """)
    
    # Rendre chef_planteur_id obligatoire pour les nouveaux planteurs
    # (les anciens peuvent rester NULL temporairement)


def downgrade() -> None:
    # Supprimer la colonne superficie_hectares des planteurs
    op.drop_column('planters', 'superficie_hectares')
    
    # Reconvertir quantite_max_kg en superficie_hectares
    op.execute("""
        UPDATE chef_planteurs 
        SET quantite_max_kg = quantite_max_kg / 1000
    """)
    
    op.alter_column('chef_planteurs', 'quantite_max_kg',
                    new_column_name='superficie_hectares',
                    type_=sa.Numeric(10, 2),
                    nullable=False)
