"""
초기 데이터 시드 스크립트.
실행: cd backend && .venv/Scripts/python seed.py
"""
import asyncio
import sys
from datetime import datetime
from pathlib import Path

# backend/ 를 임포트 경로에 추가
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from app.db.session import async_session_factory
from app.db.models import (
    BranchGroup, Branch, User,
    ParticipationData, NpsData, PraiseData, ComplaintData,
)
from app.core.security import hash_password


# ── 지점 그룹 3종 ──────────────────────────────
GROUPS = [
    {"code": "G01", "name": "병원급",      "category": "hospital",      "sort_order": 1},
    {"code": "G02", "name": "람스+시술",   "category": "lams_surgery",  "sort_order": 2},
    {"code": "G03", "name": "람스",        "category": "lams",          "sort_order": 3},
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
    {"code": "S02", "name": "노원점",     "group_code": "G02"},
    {"code": "S03", "name": "분당점",     "group_code": "G02"},
    {"code": "S04", "name": "성신여대점", "group_code": "G02"},
    {"code": "S05", "name": "수원점",     "group_code": "G02"},
    {"code": "S06", "name": "신촌점",     "group_code": "G02"},
    {"code": "S07", "name": "영등포점",   "group_code": "G02"},
    {"code": "S08", "name": "일산점",     "group_code": "G02"},
    {"code": "S09", "name": "천호점",     "group_code": "G02"},
    {"code": "S10", "name": "구리점",     "group_code": "G02"},
    # 람스 (G03)
    {"code": "L01", "name": "부천점",     "group_code": "G03"},
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

# ── 샘플 데이터 (최근 3개월) ──────────────────────
# 시드 데이터는 2026년 2~4월 기준 더미
SAMPLE_MONTHS = [(2026, 2), (2026, 3), (2026, 4)]


def _make_participation(branch_id: int, year: int, month: int) -> dict:
    import random
    target = random.randint(80, 200)
    participant = random.randint(int(target * 0.4), target)
    return {
        "branch_id": branch_id,
        "year": year,
        "month": month,
        "target_count": target,
        "participant_count": participant,
        "uploaded_at": datetime.utcnow(),
    }


def _make_nps_rows(branch_id: int, year: int, month: int) -> list[dict]:
    import random
    rows = []
    for day in [5, 10, 15, 20, 25]:
        total = random.randint(30, 80)
        vs = int(total * 0.8)
        s = int(total * 0.12)
        n = total - vs - s
        rows.append({
            "branch_id": branch_id,
            "year": year,
            "month": month,
            "day": day,
            "very_satisfied": vs,
            "satisfied": s,
            "normal": max(0, n - 2),
            "dissatisfied": 1,
            "very_dissatisfied": 1,
            "uploaded_at": datetime.utcnow(),
        })
    return rows


PRAISE_CONTENTS = [
    "직원분이 정말 친절하게 설명해주셔서 감사했습니다.",
    "대기 중에도 불편함 없이 편안하게 기다릴 수 있었습니다.",
    "시술 결과가 만족스럽고 의료진분들이 전문적이었습니다.",
    "안내가 명확하고 접수부터 퇴원까지 매끄러웠습니다.",
    "친절하고 세심한 케어 덕분에 안심하고 치료받았습니다.",
]

COMPLAINT_CONTENTS = [
    "대기시간이 너무 길었습니다.",
    "주차공간이 부족해 불편했습니다.",
    "안내 직원의 응대가 불친절했습니다.",
    "예약 시스템 오류로 불편을 겪었습니다.",
    "환경이 다소 노후되어 개선이 필요합니다.",
]

COMPLAINT_CATEGORIES = [
    "waiting", "parking", "rudeness", "system", "environment",
]

INFLOW_PATHS = ["인터넷", "지인소개", "SNS", "현장방문", "광고"]


async def seed():
    async with async_session_factory() as session:
        import random
        random.seed(42)

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
        branch_map: dict[str, int] = {}
        for b in BRANCHES:
            existing = (await session.exec(
                select(Branch).where(Branch.code == b["code"])
            )).first()
            if existing:
                branch_map[b["code"]] = existing.id
                print(f"[SKIP] Branch {b['code']} 이미 존재")
            else:
                obj = Branch(
                    code=b["code"],
                    name=b["name"],
                    group_id=group_map[b["group_code"]],
                )
                session.add(obj)
                await session.flush()
                branch_map[b["code"]] = obj.id
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

        await session.flush()

        # 4. ParticipationData (19지점 × 3개월)
        part_count = 0
        for year, month in SAMPLE_MONTHS:
            for code, bid in branch_map.items():
                existing = (await session.exec(
                    select(ParticipationData).where(
                        ParticipationData.branch_id == bid,
                        ParticipationData.year == year,
                        ParticipationData.month == month,
                    )
                )).first()
                if not existing:
                    session.add(ParticipationData(**_make_participation(bid, year, month)))
                    part_count += 1
        print(f"[INSERT] ParticipationData {part_count}건")

        # 5. NpsData (19지점 × 3개월 × 5일)
        nps_count = 0
        for year, month in SAMPLE_MONTHS:
            for code, bid in branch_map.items():
                for row in _make_nps_rows(bid, year, month):
                    existing = (await session.exec(
                        select(NpsData).where(
                            NpsData.branch_id == bid,
                            NpsData.year == year,
                            NpsData.month == month,
                            NpsData.day == row["day"],
                        )
                    )).first()
                    if not existing:
                        session.add(NpsData(**row))
                        nps_count += 1
        print(f"[INSERT] NpsData {nps_count}건")

        # 6. PraiseData (지점당 월 5~15건)
        praise_count = 0
        for year, month in SAMPLE_MONTHS:
            for code, bid in branch_map.items():
                n = random.randint(3, 10)
                for i in range(n):
                    day = random.randint(1, 25)
                    session.add(PraiseData(
                        branch_id=bid,
                        year=year,
                        month=month,
                        day=day,
                        inflow_path=random.choice(INFLOW_PATHS),
                        content=random.choice(PRAISE_CONTENTS),
                        target_person=f"직원{random.randint(1, 10):02d}",
                        uploaded_at=datetime.utcnow(),
                    ))
                    praise_count += 1
        print(f"[INSERT] PraiseData {praise_count}건")

        # 7. ComplaintData (지점당 월 1~5건)
        complaint_count = 0
        for year, month in SAMPLE_MONTHS:
            for code, bid in branch_map.items():
                n = random.randint(1, 4)
                for i in range(n):
                    day = random.randint(1, 25)
                    session.add(ComplaintData(
                        branch_id=bid,
                        year=year,
                        month=month,
                        day=day,
                        inflow_path=random.choice(INFLOW_PATHS),
                        content=random.choice(COMPLAINT_CONTENTS),
                        category=random.choice(COMPLAINT_CATEGORIES),
                        uploaded_at=datetime.utcnow(),
                    ))
                    complaint_count += 1
        print(f"[INSERT] ComplaintData {complaint_count}건")

        await session.commit()
        print("\n시드 완료!")


if __name__ == "__main__":
    asyncio.run(seed())
