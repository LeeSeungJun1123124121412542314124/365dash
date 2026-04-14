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
    category: str = Field(max_length=20)                # hospital / lams_surgery / lams
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
    role: str = Field(max_length=20)                    # admin / general_manager / branch_manager / staff
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
    upload_type: str = Field(max_length=20)             # participation / nps / praise / complaint
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
# NPS 데이터 — §3.5 (UPSERT on branch_id+year+month+day)
# ──────────────────────────────────────────

class NpsData(SQLModel, table=True):
    __tablename__ = "nps_data"

    id: Optional[int] = Field(default=None, primary_key=True)
    branch_id: int = Field(foreign_key="branches.id")
    year: int
    month: int
    day: int = Field(default=1)                 # §3.5 일자 컬럼
    very_satisfied: int = Field(default=0)      # 매우만족
    satisfied: int = Field(default=0)           # 만족
    normal: int = Field(default=0)              # 보통 (스펙: normal)
    dissatisfied: int = Field(default=0)        # 불만족
    very_dissatisfied: int = Field(default=0)   # 매우불만족
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    uploaded_by: Optional[int] = Field(default=None, foreign_key="users.id")


# ──────────────────────────────────────────
# 칭찬 데이터 — §3.7 (행 단위 raw, DELETE+INSERT)
# ──────────────────────────────────────────

class PraiseData(SQLModel, table=True):
    __tablename__ = "praise_data"

    id: Optional[int] = Field(default=None, primary_key=True)
    branch_id: int = Field(foreign_key="branches.id")
    year: int
    month: int
    day: int
    inflow_path: Optional[str] = Field(default=None, max_length=100)   # 유입경로
    content: str                                                         # 칭찬내용
    target_person: Optional[str] = Field(default=None, max_length=100)  # 칭찬대상자
    batch_id: Optional[int] = Field(default=None, foreign_key="upload_batches.id")
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    uploaded_by: Optional[int] = Field(default=None, foreign_key="users.id")


# ──────────────────────────────────────────
# 불만 데이터 — §3.8 (행 단위 raw, DELETE+INSERT)
# ──────────────────────────────────────────

COMPLAINT_CATEGORIES = [
    "parking", "guidance", "waiting", "rudeness",
    "system", "privacy", "environment", "other",
]

class ComplaintData(SQLModel, table=True):
    __tablename__ = "complaint_data"

    id: Optional[int] = Field(default=None, primary_key=True)
    branch_id: int = Field(foreign_key="branches.id")
    year: int
    month: int
    day: int
    inflow_path: Optional[str] = Field(default=None, max_length=100)   # 유입경로
    content: str                                                         # 불만내용
    category: str = Field(max_length=20)                                # complaint_category enum 값
    batch_id: Optional[int] = Field(default=None, foreign_key="upload_batches.id")
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    uploaded_by: Optional[int] = Field(default=None, foreign_key="users.id")
