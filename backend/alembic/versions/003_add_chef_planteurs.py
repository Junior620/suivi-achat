"""add chef planteurs

Revision ID: 003
Revises: 002
Create Date: 2025-11-14 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Créer la table chef_planteurs
    op.create_table('chef_planteurs',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('superficie_hectares', sa.Numeric(10, 2), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_chef_planteurs_name'), 'chef_planteurs', ['name'], unique=True)
    
    # Ajouter la colonne chef_planteur_id dans planters
    op.add_column('planters', sa.Column('chef_planteur_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_index(op.f('ix_planters_chef_planteur_id'), 'planters', ['chef_planteur_id'])
    op.create_foreign_key('fk_planters_chef_planteur', 'planters', 'chef_planteurs', ['chef_planteur_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    # Supprimer la foreign key et la colonne
    op.drop_constraint('fk_planters_chef_planteur', 'planters', type_='foreignkey')
    op.drop_index(op.f('ix_planters_chef_planteur_id'), table_name='planters')
    op.drop_column('planters', 'chef_planteur_id')
    
    # Supprimer la table chef_planteurs
    op.drop_index(op.f('ix_chef_planteurs_name'), table_name='chef_planteurs')
    op.drop_table('chef_planteurs')
