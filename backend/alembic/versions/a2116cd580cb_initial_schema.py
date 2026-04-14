"""initial_schema

Revision ID: a2116cd580cb
Revises:
Create Date: 2026-04-14 16:07:02.622800

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'a2116cd580cb'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'branch_groups',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('code', sqlmodel.sql.sqltypes.AutoString(length=10), nullable=False),
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
        sa.Column('category', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
    )
    op.create_table(
        'branches',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('code', sqlmodel.sql.sqltypes.AutoString(length=10), nullable=False),
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
        sa.Column('group_id', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.ForeignKeyConstraint(['group_id'], ['branch_groups.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
    )
    op.create_index('idx_branches_group', 'branches', ['group_id'])

    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
        sa.Column('hashed_password', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('display_name', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
        sa.Column('role', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column('branch_id', sa.Integer(), nullable=True),
        sa.Column('group_id', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id']),
        sa.ForeignKeyConstraint(['group_id'], ['branch_groups.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('username'),
    )

    op.create_table(
        'upload_batches',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('upload_type', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('month', sa.Integer(), nullable=False),
        sa.Column('branch_id', sa.Integer(), nullable=False),
        sa.Column('uploaded_by', sa.Integer(), nullable=False),
        sa.Column('uploaded_at', sa.DateTime(), nullable=False),
        sa.Column('row_count', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id']),
        sa.ForeignKeyConstraint(['uploaded_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_upload_batches_lookup', 'upload_batches', ['upload_type', 'branch_id', 'year', 'month'])

    op.create_table(
        'participation_data',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('branch_id', sa.Integer(), nullable=False),
        sa.Column('year', sa.SmallInteger(), nullable=False),
        sa.Column('month', sa.SmallInteger(), nullable=False),
        sa.Column('target_count', sa.Integer(), nullable=False),
        sa.Column('participant_count', sa.Integer(), nullable=False),
        sa.Column('uploaded_at', sa.DateTime(), nullable=False),
        sa.Column('uploaded_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id']),
        sa.ForeignKeyConstraint(['uploaded_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('branch_id', 'year', 'month', name='uq_participation'),
        sa.CheckConstraint('year BETWEEN 2000 AND 2099', name='chk_participation_year'),
        sa.CheckConstraint('month BETWEEN 1 AND 12', name='chk_participation_month'),
        sa.CheckConstraint('target_count >= 1', name='chk_participation_target'),
        sa.CheckConstraint('participant_count >= 0', name='chk_participation_participant'),
    )

    op.create_table(
        'nps_data',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('branch_id', sa.Integer(), nullable=False),
        sa.Column('year', sa.SmallInteger(), nullable=False),
        sa.Column('month', sa.SmallInteger(), nullable=False),
        sa.Column('day', sa.SmallInteger(), nullable=False, server_default='1'),
        sa.Column('very_satisfied', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('satisfied', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('normal', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('dissatisfied', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('very_dissatisfied', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('uploaded_at', sa.DateTime(), nullable=False),
        sa.Column('uploaded_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id']),
        sa.ForeignKeyConstraint(['uploaded_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('branch_id', 'year', 'month', 'day', name='uq_nps'),
        sa.CheckConstraint('year BETWEEN 2000 AND 2099', name='chk_nps_year'),
        sa.CheckConstraint('month BETWEEN 1 AND 12', name='chk_nps_month'),
        sa.CheckConstraint('day BETWEEN 1 AND 31', name='chk_nps_day'),
    )

    op.create_table(
        'praise_data',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('branch_id', sa.Integer(), nullable=False),
        sa.Column('year', sa.SmallInteger(), nullable=False),
        sa.Column('month', sa.SmallInteger(), nullable=False),
        sa.Column('day', sa.SmallInteger(), nullable=False),
        sa.Column('inflow_path', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('target_person', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
        sa.Column('batch_id', sa.Integer(), nullable=True),
        sa.Column('uploaded_at', sa.DateTime(), nullable=False),
        sa.Column('uploaded_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id']),
        sa.ForeignKeyConstraint(['batch_id'], ['upload_batches.id']),
        sa.ForeignKeyConstraint(['uploaded_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('year BETWEEN 2000 AND 2099', name='chk_praise_year'),
        sa.CheckConstraint('month BETWEEN 1 AND 12', name='chk_praise_month'),
        sa.CheckConstraint('day BETWEEN 1 AND 31', name='chk_praise_day'),
    )
    op.create_index('idx_praise_lookup', 'praise_data', ['branch_id', 'year', 'month'])

    op.create_table(
        'complaint_data',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('branch_id', sa.Integer(), nullable=False),
        sa.Column('year', sa.SmallInteger(), nullable=False),
        sa.Column('month', sa.SmallInteger(), nullable=False),
        sa.Column('day', sa.SmallInteger(), nullable=False),
        sa.Column('inflow_path', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('category', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column('batch_id', sa.Integer(), nullable=True),
        sa.Column('uploaded_at', sa.DateTime(), nullable=False),
        sa.Column('uploaded_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id']),
        sa.ForeignKeyConstraint(['batch_id'], ['upload_batches.id']),
        sa.ForeignKeyConstraint(['uploaded_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('year BETWEEN 2000 AND 2099', name='chk_complaint_year'),
        sa.CheckConstraint('month BETWEEN 1 AND 12', name='chk_complaint_month'),
        sa.CheckConstraint('day BETWEEN 1 AND 31', name='chk_complaint_day'),
        sa.CheckConstraint(
            "category IN ('parking','guidance','waiting','rudeness','system','privacy','environment','other')",
            name='chk_complaint_category',
        ),
    )
    op.create_index('idx_complaint_lookup', 'complaint_data', ['branch_id', 'year', 'month'])
    op.create_index('idx_complaint_category', 'complaint_data', ['category', 'year', 'month'])


def downgrade() -> None:
    op.drop_index('idx_complaint_category', table_name='complaint_data')
    op.drop_index('idx_complaint_lookup', table_name='complaint_data')
    op.drop_table('complaint_data')
    op.drop_index('idx_praise_lookup', table_name='praise_data')
    op.drop_table('praise_data')
    op.drop_table('nps_data')
    op.drop_table('participation_data')
    op.drop_index('idx_upload_batches_lookup', table_name='upload_batches')
    op.drop_table('upload_batches')
    op.drop_table('users')
    op.drop_index('idx_branches_group', table_name='branches')
    op.drop_table('branches')
    op.drop_table('branch_groups')
