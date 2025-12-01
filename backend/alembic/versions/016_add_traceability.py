"""add traceability and blockchain

Revision ID: 016
Revises: 015
Create Date: 2025-12-01 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '016'
down_revision = '015'
branch_labels = None
depends_on = None


def upgrade():
    # Créer la table traceability_records
    op.create_table('traceability_records',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('delivery_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('qr_code', sa.String(length=255), nullable=False),
        sa.Column('qr_code_image', sa.Text(), nullable=True),
        sa.Column('blockchain_hash', sa.String(length=64), nullable=False),
        sa.Column('previous_hash', sa.String(length=64), nullable=True),
        sa.Column('block_number', sa.Integer(), nullable=False),
        sa.Column('trace_data', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('verified_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['delivery_id'], ['deliveries.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_traceability_records_qr_code'), 'traceability_records', ['qr_code'], unique=True)
    op.create_index(op.f('ix_traceability_records_blockchain_hash'), 'traceability_records', ['blockchain_hash'], unique=True)
    
    # Créer la table traceability_scans
    op.create_table('traceability_scans',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('record_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('scanned_by', sa.String(length=255), nullable=True),
        sa.Column('scan_location', sa.String(length=255), nullable=True),
        sa.Column('scan_type', sa.String(length=50), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('latitude', sa.String(length=50), nullable=True),
        sa.Column('longitude', sa.String(length=50), nullable=True),
        sa.Column('scanned_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['record_id'], ['traceability_records.id'], ),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('traceability_scans')
    op.drop_index(op.f('ix_traceability_records_blockchain_hash'), table_name='traceability_records')
    op.drop_index(op.f('ix_traceability_records_qr_code'), table_name='traceability_records')
    op.drop_table('traceability_records')
