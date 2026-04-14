"""참여율 집계 API — §5.2 스펙 기반."""
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_user, get_data_filter, get_session
from app.db.models import Branch, ParticipationData
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
    perm = get_data_filter(user)
    eff_group  = perm["group_id"]  if perm["group_id"]  is not None else group_id
    eff_branch = perm["branch_id"] if perm["branch_id"] is not None else branch_id

    period = recent_months(months)
    baseline_series = []
    filtered_series = []

    for year, month in period:
        label = f"{year}-{month:02d}"

        rb = (await session.exec(
            select(
                func.sum(ParticipationData.target_count).label("t"),
                func.sum(ParticipationData.participant_count).label("p"),
            ).where(ParticipationData.year == year, ParticipationData.month == month)
        )).first()

        qf = select(
            func.sum(ParticipationData.target_count).label("t"),
            func.sum(ParticipationData.participant_count).label("p"),
        ).where(ParticipationData.year == year, ParticipationData.month == month)
        if eff_group:
            qf = qf.join(Branch, Branch.id == ParticipationData.branch_id).where(Branch.group_id == eff_group)
        elif eff_branch:
            qf = qf.where(ParticipationData.branch_id == eff_branch)
        rf = (await session.exec(qf)).first()

        baseline_series.append({"x": label, "rate": _rate(rb.t or 0, rb.p or 0)})
        filtered_series.append({"x": label, "rate": _rate(rf.t or 0, rf.p or 0)})

    # 최신 월 스코어카드
    current_rate = filtered_series[-1]["rate"] if filtered_series else None

    return {
        "scorecard": {"current_month_rate": current_rate},
        "chart": {
            "series": [
                {"label": "기준값 (전체)", "type": "line", "data": baseline_series},
                {"label": "필터값 (선택 지점/군)", "type": "line", "data": filtered_series},
            ]
        },
    }
