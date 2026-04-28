"""complaint_branch_to_group

불만 데이터 집계 단위를 지점(branch) → 대분류(group)로 변경.

Revision ID: d5b2c3e45678
Revises: c4f8a1e23456
Create Date: 2026-04-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd5b2c3e45678'
down_revision: Union[str, None] = 'c4f8a1e23456'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1) group_id 컬럼 추가 (NULL 허용 후 채우기)
    op.add_column('complaint_data', sa.Column('group_id', sa.Integer(), nullable=True))

    # 2) 기존 branch_id → 해당 지점의 group_id 이전
    op.execute("""
        UPDATE complaint_data cd
           SET group_id = b.group_id
          FROM branches b
         WHERE cd.branch_id = b.id
    """)

    # 3) group_id NOT NULL + FK 설정
    op.alter_column('complaint_data', 'group_id', nullable=False)
    op.create_foreign_key(
        'fk_complaint_data_group_id',
        'complaint_data', 'branch_groups',
        ['group_id'], ['id'],
    )

    # 4) 구 branch_id FK / 컬럼 제거
    op.drop_constraint('complaint_data_branch_id_fkey', 'complaint_data', type_='foreignkey')
    op.drop_column('complaint_data', 'branch_id')


def downgrade() -> None:
    op.add_column('complaint_data', sa.Column('branch_id', sa.Integer(), nullable=True))
    op.drop_constraint('fk_complaint_data_group_id', 'complaint_data', type_='foreignkey')
    op.drop_column('complaint_data', 'group_id')
