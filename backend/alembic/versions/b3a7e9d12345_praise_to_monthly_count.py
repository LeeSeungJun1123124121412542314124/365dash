"""praise_to_monthly_count

칭찬 데이터를 행 단위 raw → 월 단위 집계 컬럼(count)로 변환.

Revision ID: b3a7e9d12345
Revises: a2116cd580cb
Create Date: 2026-04-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b3a7e9d12345'
down_revision: Union[str, None] = 'a2116cd580cb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1) 신규 count 컬럼 추가 (NULL 허용 후 기본값 0)
    op.add_column(
        'praise_data',
        sa.Column('count', sa.Integer(), nullable=False, server_default='0'),
    )

    # 2) 기존 행 단위 raw 데이터를 (branch_id, year, month) 단위로 집계
    #    동일 키 중 가장 작은 id 행에 count 합계를 기록하고 나머지는 삭제.
    op.execute("""
        WITH agg AS (
            SELECT branch_id, year, month, COUNT(*) AS cnt, MIN(id) AS keep_id
              FROM praise_data
             GROUP BY branch_id, year, month
        )
        UPDATE praise_data p
           SET count = agg.cnt
          FROM agg
         WHERE p.id = agg.keep_id
    """)
    op.execute("""
        DELETE FROM praise_data p
         USING (
            SELECT branch_id, year, month, MIN(id) AS keep_id
              FROM praise_data
             GROUP BY branch_id, year, month
         ) k
         WHERE p.branch_id = k.branch_id
           AND p.year      = k.year
           AND p.month     = k.month
           AND p.id       <> k.keep_id
    """)

    # 3) 사용하지 않는 컬럼 제거
    op.drop_column('praise_data', 'inflow_path')
    op.drop_column('praise_data', 'content')
    op.drop_column('praise_data', 'target_person')


def downgrade() -> None:
    op.add_column(
        'praise_data',
        sa.Column('inflow_path', sa.String(length=100), nullable=True),
    )
    op.add_column(
        'praise_data',
        sa.Column('content', sa.Text(), nullable=False, server_default=''),
    )
    op.add_column(
        'praise_data',
        sa.Column('target_person', sa.String(length=100), nullable=True),
    )
    op.drop_column('praise_data', 'count')
