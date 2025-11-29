"""initial schema

Revision ID: 001
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    
    op.create_table('users',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('password_hash', sa.String(), nullable=False),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("role IN ('admin', 'manager', 'viewer')", name='users_role_check')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    
    op.create_table('planters',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_planters_name'), 'planters', ['name'], unique=True)
    
    op.create_table('deliveries',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('planter_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('quantity_kg', sa.Numeric(12, 2), nullable=False),
        sa.Column('load_location', sa.String(), nullable=False),
        sa.Column('unload_location', sa.String(), nullable=False),
        sa.Column('cocoa_quality', sa.String(), nullable=False),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['planter_id'], ['planters.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('quantity_kg > 0', name='deliveries_quantity_check')
    )
    op.create_index(op.f('ix_deliveries_date'), 'deliveries', ['date'])
    op.create_index(op.f('ix_deliveries_planter_id'), 'deliveries', ['planter_id'])
    op.create_index(op.f('ix_deliveries_load_location'), 'deliveries', ['load_location'])
    op.create_index(op.f('ix_deliveries_unload_location'), 'deliveries', ['unload_location'])
    op.create_index(op.f('ix_deliveries_cocoa_quality'), 'deliveries', ['cocoa_quality'])


def downgrade() -> None:
    op.drop_table('deliveries')
    op.drop_table('planters')
    op.drop_table('users')
