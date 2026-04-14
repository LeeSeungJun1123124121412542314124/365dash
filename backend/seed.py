"""
초기 데이터 시드 스크립트.
실행: cd backend && .venv/Scripts/python seed.py
"""
import asyncio
import sys
from pathlib import Path

# backend/ 를 임포트 경로에 추가
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from app.db.session import async_session_factory
from app.db.models import BranchGroup, Branch, User
from app.core.security import hash_password


# ── 지점 그룹 3종 ──────────────────────────────
GROUPS = [
    {"code": "G01", "name": "병원급",      "category": "hospital"},
    {"code": "G02", "name": "람스+시술",   "category": "lams_surgery"},
    {"code": "G03", "name": "람스",        "category": "lams"},
]

# ── 지점 19개 ─────────────────────────────────
BRANCHES = [
    # 병원급 (G01)
    {"code": "B01", "name": "서울병원",   "group_code": "G01"},
    {"code": "B02", "name": "대전병원",   "group_code": "G01"},
    {"code": "B03", "name": "부산병원",   "group_code": "G01"},
    {"code": "B04", "name": "인천병원",   "group_code": "G01"},
    {"code": "B05", "name": "대구병원",   "group_code": "G01"},
    # 람스+시술 (G02)
    {"code": "S01", "name": "강남본점",   "group_code": "G02"},
    {"code": "S02", "name": "노원",       "group_code": "G02"},
    {"code": "S03", "name": "분당",       "group_code": "G02"},
    {"code": "S04", "name": "성신여대",   "group_code": "G02"},
    {"code": "S05", "name": "수원",       "group_code": "G02"},
    {"code": "S06", "name": "신촌",       "group_code": "G02"},
    {"code": "S07", "name": "영등포",     "group_code": "G02"},
    {"code": "S08", "name": "일산",       "group_code": "G02"},
    {"code": "S09", "name": "천호",       "group_code": "G02"},
    # 람스 (G03)
    {"code": "L01", "name": "부천",       "group_code": "G03"},
    {"code": "L02", "name": "안양평촌",   "group_code": "G03"},
    {"code": "L03", "name": "천안",       "group_code": "G03"},
    {"code": "L04", "name": "청주",       "group_code": "G03"},
    {"code": "L05", "name": "해운대",     "group_code": "G03"},
]

# ── 초기 사용자 ────────────────────────────────
INITIAL_USERS = [
    {
        "username": "admin",
        "password": "admin1234!",
        "display_name": "관리자",
        "role": "admin",
    },
]


async def seed():
    async with async_session_factory() as session:
        # 1. BranchGroup
        group_map: dict[str, int] = {}
        for g in GROUPS:
            existing = (await session.exec(
                select(BranchGroup).where(BranchGroup.code == g["code"])
            )).first()
            if existing:
                group_map[g["code"]] = existing.id
                print(f"[SKIP] BranchGroup {g['code']} 이미 존재")
            else:
                obj = BranchGroup(**g)
                session.add(obj)
                await session.flush()
                group_map[g["code"]] = obj.id
                print(f"[INSERT] BranchGroup {g['code']} {g['name']}")

        # 2. Branch
        for b in BRANCHES:
            existing = (await session.exec(
                select(Branch).where(Branch.code == b["code"])
            )).first()
            if existing:
                print(f"[SKIP] Branch {b['code']} 이미 존재")
            else:
                obj = Branch(
                    code=b["code"],
                    name=b["name"],
                    group_id=group_map[b["group_code"]],
                )
                session.add(obj)
                print(f"[INSERT] Branch {b['code']} {b['name']}")

        # 3. User
        for u in INITIAL_USERS:
            existing = (await session.exec(
                select(User).where(User.username == u["username"])
            )).first()
            if existing:
                print(f"[SKIP] User '{u['username']}' 이미 존재")
            else:
                obj = User(
                    username=u["username"],
                    hashed_password=hash_password(u["password"]),
                    display_name=u["display_name"],
                    role=u["role"],
                )
                session.add(obj)
                print(f"[INSERT] User '{u['username']}' (role={u['role']})")

        await session.commit()
        print("\n시드 완료!")


if __name__ == "__main__":
    asyncio.run(seed())
