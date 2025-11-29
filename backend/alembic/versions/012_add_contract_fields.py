"""add contract fields to chef_planteurs

Revision ID: 012
Revises: 011
Create Date: 2024-01-12

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '012'
down_revision = '011'
branch_labels = None
depends_on = None

def upgrade():
    # Ajouter les champs de contrat aux fournisseurs
    op.add_column('chef_planteurs', sa.Column('date_debut_contrat', sa.Date(), nullable=True))
    op.add_column('chef_planteurs', sa.Column('date_fin_contrat', sa.Date(), nullable=True))
    op.add_column('chef_planteurs', sa.Column('raison_fin_contrat', sa.String(), nullable=True))

def downgrade():
    op.drop_column('chef_planteurs', 'raison_fin_contrat')
    op.drop_column('chef_planteurs', 'date_fin_contrat')
    op.drop_column('chef_planteurs', 'date_debut_contrat')
