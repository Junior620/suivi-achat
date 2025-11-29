"""add location fields

Revision ID: 011
Revises: 010
Create Date: 2024-01-11

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '011'
down_revision = '010'
branch_labels = None
depends_on = None

def upgrade():
    # Ajouter les champs de localisation aux planteurs
    op.add_column('planters', sa.Column('region', sa.String(), nullable=True))
    op.add_column('planters', sa.Column('departement', sa.String(), nullable=True))
    op.add_column('planters', sa.Column('localite', sa.String(), nullable=True))
    
    # Ajouter les champs de localisation aux fournisseurs
    op.add_column('chef_planteurs', sa.Column('region', sa.String(), nullable=True))
    op.add_column('chef_planteurs', sa.Column('departement', sa.String(), nullable=True))
    op.add_column('chef_planteurs', sa.Column('localite', sa.String(), nullable=True))

def downgrade():
    # Supprimer les champs des planteurs
    op.drop_column('planters', 'localite')
    op.drop_column('planters', 'departement')
    op.drop_column('planters', 'region')
    
    # Supprimer les champs des fournisseurs
    op.drop_column('chef_planteurs', 'localite')
    op.drop_column('chef_planteurs', 'departement')
    op.drop_column('chef_planteurs', 'region')
