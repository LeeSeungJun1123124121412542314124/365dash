"""complaint_to_keyword_count

불만 데이터를 행 단위 raw → 키워드+개수 집계 컬럼으로 변환.

Revision ID: c4f8a1e23456
Revises: b3a7e9d12345
Create Date: 2026-04-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c4f8a1e23456'
down_revision: Union[str, None] = 'b3a7e9d12345'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1) 새 컬럼 추가
    op.add_column('complaint_data', sa.Column('keyword', sa.String(length=100), nullable=False, server_default='기타'))
    op.add_column('complaint_data', sa.Column('count', sa.Integer(), nullable=False, server_default='1'))

    # 2) 기존 category → keyword 값 이전
    op.execute("""
        UPDATE complaint_data
           SET keyword = CASE category
               WHEN 'parking'     THEN '주차'
               WHEN 'guidance'    THEN '안내 응대부족'
               WHEN 'waiting'     THEN '대기관련'
               WHEN 'rudeness'    THEN '불친절'
               WHEN 'system'      THEN '시스템불만'
               WHEN 'privacy'     THEN '개인정보'
               WHEN 'environment' THEN '환경불만'
               ELSE '기타'
           END
    """)

    # 3) 구 컬럼 제거
    op.drop_column('complaint_data', 'inflow_path')
    op.drop_column('complaint_data', 'content')
    op.drop_column('complaint_data', 'category')


def downgrade() -> None:
    op.add_column('complaint_data', sa.Column('inflow_path', sa.String(length=100), nullable=True))
    op.add_column('complaint_data', sa.Column('content', sa.Text(), nullable=False, server_default=''))
    op.add_column('complaint_data', sa.Column('category', sa.String(length=20), nullable=False, server_default='other'))
    op.drop_column('complaint_data', 'count')
    op.drop_column('complaint_data', 'keyword')
