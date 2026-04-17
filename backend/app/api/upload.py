"""엑셀 업로드 엔드포인트 4종 — §4 스펙 기반."""
from datetime import datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy import delete
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import ManagerAbove, get_current_user, get_session
from app.db.models import (
    Branch, ComplaintData, NpsData, ParticipationData, PraiseData, UploadBatch,
)
from app.schemas.common import UploadResponse
from app.services import excel_parser

router = APIRouter(prefix="/upload", tags=["엑셀 업로드"])

UploadType = Literal["participation", "nps", "praise", "complaint"]

PARSERS = {
    "participation": excel_parser.parse_participation,
    "nps": excel_parser.parse_nps,
    "praise": excel_parser.parse_praise,
    "complaint": excel_parser.parse_complaint,
}

MAX_BYTES = 10 * 1024 * 1024  # 10 MB


async def _get_branch_map(session: AsyncSession, names: list[str]) -> dict[str, int]:
    """지점명 리스트 → {name: id} 딕셔너리 일괄 조회."""
    result = await session.exec(select(Branch).where(Branch.name.in_(names)))
    return {b.name: b.id for b in result.all()}


async def _upsert_participation(
    session: AsyncSession,
    records: list[dict],
    user_id: int,
) -> int:
    """참여율 — UPSERT on (branch_id, year, month)."""
    names = list({r["branch_name"] for r in records})
    branch_map = await _get_branch_map(session, names)

    missing = [n for n in names if n not in branch_map]
    if missing:
        raise ValueError(f"존재하지 않는 지점명: {', '.join(missing)}")

    count = 0
    for rec in records:
        bid = branch_map[rec["branch_name"]]
        existing = (await session.exec(
            select(ParticipationData).where(
                ParticipationData.branch_id == bid,
                ParticipationData.year == rec["year"],
                ParticipationData.month == rec["month"],
            )
        )).first()
        if existing:
            existing.target_count = rec["target_count"]
            existing.participant_count = rec["participant_count"]
            existing.uploaded_at = datetime.utcnow()
            existing.uploaded_by = user_id
            session.add(existing)
        else:
            session.add(ParticipationData(
                branch_id=bid,
                year=rec["year"],
                month=rec["month"],
                target_count=rec["target_count"],
                participant_count=rec["participant_count"],
                uploaded_at=datetime.utcnow(),
                uploaded_by=user_id,
            ))
            count += 1
    return count


async def _upsert_nps(
    session: AsyncSession,
    records: list[dict],
    user_id: int,
) -> int:
    """NPS — UPSERT on (branch_id, year, month)."""
    names = list({r["branch_name"] for r in records})
    branch_map = await _get_branch_map(session, names)

    missing = [n for n in names if n not in branch_map]
    if missing:
        raise ValueError(f"존재하지 않는 지점명: {', '.join(missing)}")

    count = 0
    for rec in records:
        bid = branch_map[rec["branch_name"]]
        existing = (await session.exec(
            select(NpsData).where(
                NpsData.branch_id == bid,
                NpsData.year == rec["year"],
                NpsData.month == rec["month"],
            )
        )).first()
        if existing:
            existing.very_satisfied = rec["very_satisfied"]
            existing.satisfied = rec["satisfied"]
            existing.normal = rec["normal"]
            existing.dissatisfied = rec["dissatisfied"]
            existing.very_dissatisfied = rec["very_dissatisfied"]
            existing.uploaded_at = datetime.utcnow()
            existing.uploaded_by = user_id
            session.add(existing)
        else:
            session.add(NpsData(
                branch_id=bid,
                year=rec["year"],
                month=rec["month"],
                very_satisfied=rec["very_satisfied"],
                satisfied=rec["satisfied"],
                normal=rec["normal"],
                dissatisfied=rec["dissatisfied"],
                very_dissatisfied=rec["very_dissatisfied"],
                uploaded_at=datetime.utcnow(),
                uploaded_by=user_id,
            ))
            count += 1
    return count


async def _replace_praise(
    session: AsyncSession,
    records: list[dict],
    user_id: int,
) -> int:
    """칭찬 — DELETE + INSERT (동일 branch/year/month 트랜잭션)."""
    names = list({r["branch_name"] for r in records})
    branch_map = await _get_branch_map(session, names)

    missing = [n for n in names if n not in branch_map]
    if missing:
        raise ValueError(f"존재하지 않는 지점명: {', '.join(missing)}")

    # 대상 (branch_id, year, month) 조합 추출
    combos = {
        (branch_map[r["branch_name"]], r["year"], r["month"])
        for r in records
    }

    # 기존 행 삭제
    for bid, year, month in combos:
        await session.exec(
            delete(PraiseData).where(
                PraiseData.branch_id == bid,
                PraiseData.year == year,
                PraiseData.month == month,
            )
        )

    # 신규 삽입
    for rec in records:
        bid = branch_map[rec["branch_name"]]
        session.add(PraiseData(
            branch_id=bid,
            year=rec["year"],
            month=rec["month"],
            inflow_path=rec.get("inflow_path"),
            content=rec["content"],
            target_person=rec.get("target_person"),
            uploaded_at=datetime.utcnow(),
            uploaded_by=user_id,
        ))

    return len(records)


async def _replace_complaint(
    session: AsyncSession,
    records: list[dict],
    user_id: int,
) -> int:
    """불만 — DELETE + INSERT (동일 branch/year/month 트랜잭션)."""
    names = list({r["branch_name"] for r in records})
    branch_map = await _get_branch_map(session, names)

    missing = [n for n in names if n not in branch_map]
    if missing:
        raise ValueError(f"존재하지 않는 지점명: {', '.join(missing)}")

    combos = {
        (branch_map[r["branch_name"]], r["year"], r["month"])
        for r in records
    }

    for bid, year, month in combos:
        await session.exec(
            delete(ComplaintData).where(
                ComplaintData.branch_id == bid,
                ComplaintData.year == year,
                ComplaintData.month == month,
            )
        )

    for rec in records:
        bid = branch_map[rec["branch_name"]]
        session.add(ComplaintData(
            branch_id=bid,
            year=rec["year"],
            month=rec["month"],
            inflow_path=rec.get("inflow_path"),
            content=rec["content"],
            category=rec["category"],
            uploaded_at=datetime.utcnow(),
            uploaded_by=user_id,
        ))

    return len(records)


@router.post("/{upload_type}", response_model=UploadResponse)
async def upload_excel(
    upload_type: UploadType,
    file: UploadFile,
    user: Annotated[dict, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    _auth=ManagerAbove,
):
    # 파일 형식 검증
    if not (file.filename or "").lower().endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="엑셀 파일(.xlsx 또는 .xls)만 업로드 가능합니다.",
        )

    content = await file.read()

    # 파일 크기 제한 (10 MB)
    if len(content) > MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"파일 크기가 10 MB를 초과합니다. (현재: {len(content) / 1024 / 1024:.1f} MB)",
        )

    parse_fn = PARSERS[upload_type]
    records, errors = parse_fn(content)

    if errors:
        return UploadResponse(success=False, uploaded_count=0, errors=errors)

    # 빈 파일
    if not records:
        return UploadResponse(success=True, uploaded_count=0)

    user_id = user["user_id"]

    try:
        if upload_type == "participation":
            count = await _upsert_participation(session, records, user_id)
        elif upload_type == "nps":
            count = await _upsert_nps(session, records, user_id)
        elif upload_type == "praise":
            count = await _replace_praise(session, records, user_id)
        else:  # 불만
            count = await _replace_complaint(session, records, user_id)

        # 업로드 배치 이력 (첫 레코드 year/month 기준 대표 로그)
        if records:
            branch_name = records[0]["branch_name"]
            branch_map = await _get_branch_map(session, [branch_name])
            rep_branch_id = branch_map.get(branch_name, 1)
            session.add(UploadBatch(
                upload_type=upload_type,
                year=records[0]["year"],
                month=records[0]["month"],
                branch_id=rep_branch_id,
                uploaded_by=user_id,
                row_count=len(records),
            ))

        await session.commit()
        return UploadResponse(success=True, uploaded_count=count)

    except ValueError as e:
        await session.rollback()
        return UploadResponse(
            success=False,
            uploaded_count=0,
            errors=[{"row": 0, "column": "지점명", "value": None, "message": str(e)}],
        )
    except Exception as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"업로드 처리 중 오류가 발생했습니다: {e}",
        )
