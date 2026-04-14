"""엑셀 업로드 엔드포인트 4종 — DB UPSERT 구현."""
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import ManagerAbove, get_current_user, get_session
from app.db.models import (
    Branch, ComplaintData, NpsData, ParticipationData, PraiseData, UploadLog,
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

# 업로드 타입별 데이터 모델 매핑
DATA_MODELS = {
    "participation": ParticipationData,
    "nps": NpsData,
    "praise": PraiseData,
    "complaint": ComplaintData,
}


async def _get_branch_id(session: AsyncSession, branch_name: str) -> int | None:
    """지점명으로 branch_id 조회."""
    result = await session.exec(select(Branch).where(Branch.name == branch_name))
    branch = result.first()
    return branch.id if branch else None


async def _upsert_records(
    session: AsyncSession,
    upload_type: UploadType,
    records: list[dict],
) -> int:
    """
    동일 (year, month, branch_id) 존재 시 업데이트, 없으면 삽입.
    §4 중복 업로드 정책: 최신 데이터로 덮어쓰기.
    """
    ModelClass = DATA_MODELS[upload_type]
    inserted = 0

    for rec in records:
        branch_id = await _get_branch_id(session, rec["branch_name"])
        if branch_id is None:
            # 등록되지 않은 지점명은 스킵 (엄격 모드로 변경 가능)
            continue

        # 기존 레코드 조회
        existing = (await session.exec(
            select(ModelClass).where(
                ModelClass.branch_id == branch_id,
                ModelClass.year == rec["year"],
                ModelClass.month == rec["month"],
            )
        )).first()

        # branch_name 제거 후 DB 필드만 사용
        data = {k: v for k, v in rec.items() if k != "branch_name"}
        data["branch_id"] = branch_id

        if existing:
            for key, val in data.items():
                setattr(existing, key, val)
            session.add(existing)
        else:
            session.add(ModelClass(**data))
            inserted += 1

    await session.flush()
    return inserted


@router.post("/{upload_type}", response_model=UploadResponse)
async def upload_excel(
    upload_type: UploadType,
    file: UploadFile,
    user: Annotated[dict, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    _auth=ManagerAbove,
):
    if not (file.filename or "").endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="엑셀 파일(.xlsx 또는 .xls)만 업로드 가능합니다.",
        )

    content = await file.read()
    parse_fn = PARSERS[upload_type]
    records, errors = parse_fn(content)

    if errors:
        return UploadResponse(success=False, inserted=0, errors=errors)

    inserted = await _upsert_records(session, upload_type, records)

    # 업로드 이력 기록 (지점별 최초 레코드의 year/month 기준)
    if records:
        log = UploadLog(
            upload_type=upload_type,
            year=records[0]["year"],
            month=records[0]["month"],
            branch_id=records[0].get("branch_id") or 1,
            uploaded_by=user["user_id"],
            row_count=len(records),
        )
        session.add(log)

    await session.commit()
    return UploadResponse(success=True, inserted=inserted, updated=len(records) - inserted)
