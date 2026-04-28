"""
SQLModel 모델 — §3 데이터 모델 기반.
"""
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


# ──────────────────────────────────────────
# 지점 그룹 / 지점
# ──────────────────────────────────────────

class BranchGroup(SQLModel, table=True):
    __tablename__ = "branch_groups"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(max_length=10, unique=True)       # 예: G01
    name: str = Field(max_length=50)                    # 병원급 / 람스+시술 / 람스
    category: str = Field(max_length=20)                # 병원급 / 람스+시술 / 람스
    sort_order: int = Field(default=0)


class Branch(SQLModel, table=True):
    __tablename__ = "branches"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(max_length=10, unique=True)       # 예: B01
    name: str = Field(max_length=50)                    # 서울병원
    group_id: int = Field(foreign_key="branch_groups.id")
    is_active: bool = Field(default=True)


# ──────────────────────────────────────────
# 사용자
# ──────────────────────────────────────────

class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(max_length=50, unique=True)
    hashed_password: str
    display_name: str = Field(max_length=100)
    role: str = Field(max_length=20)                    # 관리자 / 총괄관리자 / 지점관리자 / 직원
    branch_id: Optional[int] = Field(default=None, foreign_key="branches.id")
    group_id: Optional[int] = Field(default=None, foreign_key="branch_groups.id")
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ──────────────────────────────────────────
# 업로드 배치 이력 (4종 공통 메타)
# ──────────────────────────────────────────

class UploadBatch(SQLModel, table=True):
    __tablename__ = "upload_batches"

    id: Optional[int] = Field(default=None, primary_key=True)
    upload_type: str = Field(max_length=20)             # 참여율 / NPS / 칭찬 / 불만
    year: int
    month: int
    branch_id: int = Field(foreign_key="branches.id")
    uploaded_by: int = Field(foreign_key="users.id")
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    row_count: int = Field(default=0)


# ──────────────────────────────────────────
# 참여율 데이터 — §3.4 (UPSERT on branch_id+year+month)
# ──────────────────────────────────────────

class ParticipationData(SQLModel, table=True):
    __tablename__ = "participation_data"

    id: Optional[int] = Field(default=None, primary_key=True)
    branch_id: int = Field(foreign_key="branches.id")
    year: int
    month: int
    target_count: int = Field(default=0)        # 참여대상 (≥1)
    participant_count: int = Field(default=0)   # 참여자 수 (0 이상, ≤ target_count)
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    uploaded_by: Optional[int] = Field(default=None, foreign_key="users.id")


# ──────────────────────────────────────────
# NPS 데이터 — §3.5 (UPSERT on branch_id+year+month)
# ──────────────────────────────────────────

class NpsData(SQLModel, table=True):
    __tablename__ = "nps_data"

    id: Optional[int] = Field(default=None, primary_key=True)
    branch_id: int = Field(foreign_key="branches.id")
    year: int
    month: int
    very_satisfied: int = Field(default=0)      # 매우만족
    satisfied: int = Field(default=0)           # 만족
    normal: int = Field(default=0)              # 보통 (스펙: normal)
    dissatisfied: int = Field(default=0)        # 불만족
    very_dissatisfied: int = Field(default=0)   # 매우불만족
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    uploaded_by: Optional[int] = Field(default=None, foreign_key="users.id")


# ──────────────────────────────────────────
# 칭찬 데이터 — 월 단위 집계 (UPSERT on branch_id+year+month)
# ──────────────────────────────────────────

class PraiseData(SQLModel, table=True):
    __tablename__ = "praise_data"

    id: Optional[int] = Field(default=None, primary_key=True)
    branch_id: int = Field(foreign_key="branches.id")
    year: int
    month: int
    count: int = Field(default=0)                                       # 칭찬개수
    batch_id: Optional[int] = Field(default=None, foreign_key="upload_batches.id")
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    uploaded_by: Optional[int] = Field(default=None, foreign_key="users.id")


# ──────────────────────────────────────────
# 불만 데이터 — 키워드+개수 집계 (UPSERT on branch_id+year+month+keyword)
# ──────────────────────────────────────────

class ComplaintData(SQLModel, table=True):
    __tablename__ = "complaint_data"

    id: Optional[int] = Field(default=None, primary_key=True)
    group_id: int = Field(foreign_key="branch_groups.id")              # 대분류 단위 집계
    year: int
    month: int
    keyword: str = Field(max_length=100)                                # 불만키워드
    count: int = Field(default=0)                                       # 개수
    batch_id: Optional[int] = Field(default=None, foreign_key="upload_batches.id")
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    uploaded_by: Optional[int] = Field(default=None, foreign_key="users.id")
