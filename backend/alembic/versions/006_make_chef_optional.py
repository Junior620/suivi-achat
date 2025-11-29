"""make chef planteur optional

Revision ID: 006
Revises: 005
Create Date: 2025-11-18 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Rendre chef_planteur_id nullable (optionnel)
    op.alter_column('planters', 'chef_planteur_id',
                    existing_type=sa.dialects.postgresql.UUID(),
                    nullable=True)


def downgrade() -> None:
    # Remettre chef_planteur_id comme obligatoire
    # Attention : cela échouera s'il y a des planteurs sans chef
    op.alter_column('planters', 'chef_planteur_id',
                    existing_type=sa.dialects.postgresql.UUID(),
                    nullable=False)
