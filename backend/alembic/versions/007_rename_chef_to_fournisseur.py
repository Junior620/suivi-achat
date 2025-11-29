"""rename chef planteur to fournisseur

Revision ID: 007
Revises: 006
Create Date: 2025-11-18 19:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Renommer la table
    op.rename_table('chef_planteurs', 'fournisseurs')
    
    # Renommer la colonne dans la table planters
    op.alter_column('planters', 'chef_planteur_id',
                    new_column_name='fournisseur_id')
    
    # Renommer la contrainte de clé étrangère
    op.drop_constraint('planters_chef_planteur_id_fkey', 'planters', type_='foreignkey')
    op.create_foreign_key('planters_fournisseur_id_fkey', 'planters', 'fournisseurs',
                         ['fournisseur_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    # Restaurer la contrainte de clé étrangère
    op.drop_constraint('planters_fournisseur_id_fkey', 'planters', type_='foreignkey')
    op.create_foreign_key('planters_chef_planteur_id_fkey', 'planters', 'chef_planteurs',
                         ['chef_planteur_id'], ['id'], ondelete='SET NULL')
    
    # Restaurer le nom de la colonne
    op.alter_column('planters', 'fournisseur_id',
                    new_column_name='chef_planteur_id')
    
    # Restaurer le nom de la table
    op.rename_table('fournisseurs', 'chef_planteurs')
