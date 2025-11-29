"""add statut plantation to planters

Revision ID: 013
Revises: 012
Create Date: 2024-01-13

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '013'
down_revision = '012'
branch_labels = None
depends_on = None

def upgrade():
    # Ajouter le champ statut_plantation aux planteurs
    op.add_column('planters', sa.Column('statut_plantation', sa.String(), nullable=True))

def downgrade():
    op.drop_column('planters', 'statut_plantation')
