"""create collectes table

Revision ID: 009
Revises: 008
Create Date: 2025-11-20

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision = '009'
down_revision = '008'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'collectes',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('designation', sa.String(), nullable=False),
        sa.Column('chef_planteur_id', UUID(as_uuid=True), nullable=False),
        sa.Column('quantity_loaded_kg', sa.Numeric(12, 2), nullable=False),
        sa.Column('load_date', sa.Date(), nullable=False),
        sa.Column('quantity_unloaded_kg', sa.Numeric(12, 2), nullable=False),
        sa.Column('unload_date', sa.Date(), nullable=False),
        sa.Column('suivi', sa.Text(), nullable=True),
        sa.Column('date_collecte', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['chef_planteur_id'], ['chef_planteurs.id'], ondelete='CASCADE'),
    )
    
    op.create_index('ix_collectes_chef_planteur_id', 'collectes', ['chef_planteur_id'])
    op.create_index('ix_collectes_load_date', 'collectes', ['load_date'])
    op.create_index('ix_collectes_unload_date', 'collectes', ['unload_date'])
    op.create_index('ix_collectes_date_collecte', 'collectes', ['date_collecte'])


def downgrade():
    op.drop_index('ix_collectes_date_collecte')
    op.drop_index('ix_collectes_unload_date')
    op.drop_index('ix_collectes_load_date')
    op.drop_index('ix_collectes_chef_planteur_id')
    op.drop_table('collectes')
