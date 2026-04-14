"""
SQLModel 모델 — §3 데이터 모델 기반.
ENUM 타입은 PostgreSQL CREATE TYPE 으로 별도 생성 후 여기서 참조.
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


class Branch(SQLModel, table=True):
    __tablename__ = "branches"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(max_length=10, unique=True)       # 예: B01
    name: str = Field(max_length=50)                    # 서울병원
    group_id: int = Field(foreign_key="branch_groups.id")


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
# 업로드 이력 (4종 공통 메타)
# ──────────────────────────────────────────

class UploadLog(SQLModel, table=True):
    __tablename__ = "upload_logs"

    id: Optional[int] = Field(default=None, primary_key=True)
    upload_type: str = Field(max_length=20)             # participation / nps / praise / complaint
    year: int
    month: int
    branch_id: int = Field(foreign_key="branches.id")
    uploaded_by: int = Field(foreign_key="users.id")
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    row_count: int = Field(default=0)


# ──────────────────────────────────────────
# 참여율 데이터
# ──────────────────────────────────────────

class ParticipationData(SQLModel, table=True):
    __tablename__ = "participation_data"

    id: Optional[int] = Field(default=None, primary_key=True)
    branch_id: int = Field(foreign_key="branches.id")
    year: int
    month: int
    target_count: int = Field(default=0)
    participant_count: int = Field(default=0)
    # participation_rate: GENERATED ALWAYS AS (participant_count * 100.0 / NULLIF(target_count,0))
    # → PostgreSQL Generated Column 은 Alembic 마이그레이션에서 수동 정의


# ──────────────────────────────────────────
# NPS 데이터
# ──────────────────────────────────────────

class NpsData(SQLModel, table=True):
    __tablename__ = "nps_data"

    id: Optional[int] = Field(default=None, primary_key=True)
    branch_id: int = Field(foreign_key="branches.id")
    year: int
    month: int
    very_satisfied: int = Field(default=0)
    satisfied: int = Field(default=0)
    neutral: int = Field(default=0)
    dissatisfied: int = Field(default=0)
    very_dissatisfied: int = Field(default=0)
    # total, below_average = neutral+dissatisfied+very_dissatisfied → 서비스 레이어 계산


# ──────────────────────────────────────────
# 칭찬 데이터
# ──────────────────────────────────────────

class PraiseData(SQLModel, table=True):
    __tablename__ = "praise_data"

    id: Optional[int] = Field(default=None, primary_key=True)
    branch_id: int = Field(foreign_key="branches.id")
    year: int
    month: int
    surgery_count: int = Field(default=0)    # 수술(병원급)
    lams_count: int = Field(default=0)       # 람스
    lams_surgery_count: int = Field(default=0)  # 람스+시술


# ──────────────────────────────────────────
# 불만 데이터
# ──────────────────────────────────────────

class ComplaintData(SQLModel, table=True):
    __tablename__ = "complaint_data"

    id: Optional[int] = Field(default=None, primary_key=True)
    branch_id: int = Field(foreign_key="branches.id")
    year: int
    month: int
    surgery_count: int = Field(default=0)
    lams_count: int = Field(default=0)
    lams_surgery_count: int = Field(default=0)
    # 카테고리별 건수
    parking: int = Field(default=0)
    guidance: int = Field(default=0)
    waiting: int = Field(default=0)
    rudeness: int = Field(default=0)
    system: int = Field(default=0)
    privacy: int = Field(default=0)
    environment: int = Field(default=0)
    other: int = Field(default=0)
