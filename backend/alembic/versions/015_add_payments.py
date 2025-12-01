"""add payments table

Revision ID: 015
Revises: 014
Create Date: 2024-12-01

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '015'
down_revision = '014'
branch_labels = None
depends_on = None

def upgrade():
    # Create enum types
    op.execute("CREATE TYPE paymentmethod AS ENUM ('cash', 'virement', 'cheque')")
    op.execute("CREATE TYPE paymentstatus AS ENUM ('pending', 'completed', 'cancelled')")
    
    # Create payments table
    op.create_table('payments',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('planter_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('delivery_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('montant', sa.Float(), nullable=False),
        sa.Column('methode', sa.Enum('cash', 'virement', 'cheque', name='paymentmethod'), nullable=True),
        sa.Column('statut', sa.Enum('pending', 'completed', 'cancelled', name='paymentstatus'), nullable=True),
        sa.Column('date_paiement', sa.Date(), nullable=False),
        sa.Column('reference', sa.String(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(['planter_id'], ['planters.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['delivery_id'], ['deliveries.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('ix_payments_planter_id', 'payments', ['planter_id'])
    op.create_index('ix_payments_date_paiement', 'payments', ['date_paiement'])
    op.create_index('ix_payments_methode', 'payments', ['methode'])
    op.create_index('ix_payments_statut', 'payments', ['statut'])

def downgrade():
    op.drop_index('ix_payments_statut', table_name='payments')
    op.drop_index('ix_payments_methode', table_name='payments')
    op.drop_index('ix_payments_date_paiement', table_name='payments')
    op.drop_index('ix_payments_planter_id', table_name='payments')
    op.drop_table('payments')
    op.execute('DROP TYPE paymentstatus')
    op.execute('DROP TYPE paymentmethod')
