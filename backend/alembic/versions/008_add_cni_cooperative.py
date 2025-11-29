"""add cni and cooperative fields

Revision ID: 008
Revises: 007
Create Date: 2025-11-20

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '008'
down_revision = '007'
branch_labels = None
depends_on = None


def upgrade():
    # Ajouter les colonnes aux planteurs
    op.add_column('planters', sa.Column('cni', sa.String(), nullable=True))
    op.add_column('planters', sa.Column('cooperative', sa.String(), nullable=True))
    
    # Ajouter les colonnes aux chefs planteurs (fournisseurs)
    op.add_column('chef_planteurs', sa.Column('cni', sa.String(), nullable=True))
    op.add_column('chef_planteurs', sa.Column('cooperative', sa.String(), nullable=True))


def downgrade():
    # Supprimer les colonnes des planteurs
    op.drop_column('planters', 'cooperative')
    op.drop_column('planters', 'cni')
    
    # Supprimer les colonnes des chefs planteurs
    op.drop_column('chef_planteurs', 'cooperative')
    op.drop_column('chef_planteurs', 'cni')
