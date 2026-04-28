"""drop_day_columns

praise_data, complaint_data 의 day 컬럼 제거 (월 단위 집계로 전환됨)

Revision ID: e6c3d4f56789
Revises: d5b2c3e45678
Create Date: 2026-04-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = 'e6c3d4f56789'
down_revision: Union[str, None] = 'd5b2c3e45678'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # IF EXISTS — 로컬에서 이미 제거된 경우에도 안전하게 실행
    op.execute("ALTER TABLE praise_data DROP COLUMN IF EXISTS day")
    op.execute("ALTER TABLE complaint_data DROP COLUMN IF EXISTS day")


def downgrade() -> None:
    import sqlalchemy as sa
    op.add_column('praise_data', sa.Column('day', sa.SmallInteger(), nullable=True))
    op.add_column('complaint_data', sa.Column('day', sa.SmallInteger(), nullable=True))
