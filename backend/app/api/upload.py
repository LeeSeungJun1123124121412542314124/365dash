"""엑셀 업로드 엔드포인트 4종."""
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import ManagerAbove, get_session
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


@router.post("/{upload_type}", response_model=UploadResponse)
async def upload_excel(
    upload_type: UploadType,
    file: UploadFile,
    _user=ManagerAbove,
    session: Annotated[AsyncSession, Depends(get_session)] = None,
):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="엑셀 파일(.xlsx 또는 .xls)만 업로드 가능합니다.",
        )

    content = await file.read()
    parse_fn = PARSERS[upload_type]
    records, errors = parse_fn(content)

    if errors:
        return UploadResponse(success=False, inserted=0, errors=errors)

    # TODO: DB UPSERT 구현 (§3 ON CONFLICT 정책)
    return UploadResponse(success=True, inserted=len(records))
