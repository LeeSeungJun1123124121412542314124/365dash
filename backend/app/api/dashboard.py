"""메인 대시보드 — 최근 6개월 평균 스코어카드 + 4개 추이 그래프."""
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_user, get_session
from app.schemas.common import ChartPoint, ScoreCard

router = APIRouter(prefix="/dashboard", tags=["메인 대시보드"])


@router.get("/main")
async def get_main_dashboard(
    user: Annotated[dict, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    # TODO: 실제 집계 쿼리 구현
    return {
        "scorecards": [
            ScoreCard(label="참여율", value=None, unit="%"),
            ScoreCard(label="NPS", value=None, unit="점"),
            ScoreCard(label="칭찬", value=None, unit="건"),
            ScoreCard(label="불만", value=None, unit="건"),
        ],
        "participation_trend": [],
        "nps_trend": [],
        "praise_comparison": [],
        "complaint_comparison": [],
    }
