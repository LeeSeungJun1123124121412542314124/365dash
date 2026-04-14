"""참여율 집계 API."""
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_user, get_data_filter, get_session
from app.db.models import Branch, ParticipationData
from app.schemas.common import ChartPoint, ScoreCard
from app.services.month_window import recent_months

router = APIRouter(prefix="/participation", tags=["참여율"])


def _rate(target: int, participant: int) -> Optional[float]:
    return round(participant * 100.0 / target, 1) if target else None


@router.get("/summary")
async def get_participation_summary(
    months: int = Query(default=6, ge=1, le=24),
    group_id: Optional[int] = Query(default=None),
    branch_id: Optional[int] = Query(default=None),
    user: Annotated[dict, Depends(get_current_user)] = None,
    session: Annotated[AsyncSession, Depends(get_session)] = None,
):
    # 역할 기반 필터 (admin은 쿼리 파라미터 우선, 그 외는 강제 적용)
    perm = get_data_filter(user)
    eff_group  = perm["group_id"]  if perm["group_id"]  is not None else group_id
    eff_branch = perm["branch_id"] if perm["branch_id"] is not None else branch_id

    period = recent_months(months)
    chart = []

    for year, month in period:
        # 기준값 (전체)
        rb = (await session.exec(
            select(
                func.sum(ParticipationData.target_count).label("t"),
                func.sum(ParticipationData.participant_count).label("p"),
            ).where(ParticipationData.year == year, ParticipationData.month == month)
        )).first()

        # 필터값
        qf = select(
            func.sum(ParticipationData.target_count).label("t"),
            func.sum(ParticipationData.participant_count).label("p"),
        ).where(ParticipationData.year == year, ParticipationData.month == month)
        if eff_group:
            qf = qf.join(Branch, Branch.id == ParticipationData.branch_id).where(Branch.group_id == eff_group)
        elif eff_branch:
            qf = qf.where(ParticipationData.branch_id == eff_branch)
        rf = (await session.exec(qf)).first()

        chart.append(ChartPoint(
            label=f"{month}월",
            baseline=_rate(rb.t or 0, rb.p or 0),
            value=_rate(rf.t or 0, rf.p or 0),
        ))

    latest = chart[-1] if chart else None
    prev   = chart[-2] if len(chart) >= 2 else None
    change = None
    if latest and latest.value is not None and prev and prev.value is not None:
        change = round(latest.value - prev.value, 1)

    return {
        "scorecard": ScoreCard(label="이번달 참여율", value=latest.value if latest else None, unit="%", change=change),
        "trend": chart,
    }
