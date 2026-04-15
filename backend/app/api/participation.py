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
    year: Optional[int] = Query(default=None, ge=2000, le=2100),
    month: Optional[int] = Query(default=None, ge=1, le=12),
    group_id: Optional[int] = Query(default=None),
    branch_id: Optional[int] = Query(default=None),
    user: Annotated[dict, Depends(get_current_user)] = None,
    session: Annotated[AsyncSession, Depends(get_session)] = None,
):
    perm = get_data_filter(user)
    eff_group  = perm["group_id"]  if perm["group_id"]  is not None else group_id
    eff_branch = perm["branch_id"] if perm["branch_id"] is not None else branch_id

    base = (year, month) if (year and month) else None
    period = recent_months(months, base=base)
    baseline_series = []
    filtered_series = []

    for yr, mo in period:
        label = f"{yr}-{mo:02d}"

        base_filter = (ParticipationData.year == yr, ParticipationData.month == mo)
        rb_t = await session.scalar(select(func.sum(ParticipationData.target_count)).where(*base_filter))
        rb_p = await session.scalar(select(func.sum(ParticipationData.participant_count)).where(*base_filter))

        filt_q_t = select(func.sum(ParticipationData.target_count)).where(*base_filter)
        filt_q_p = select(func.sum(ParticipationData.participant_count)).where(*base_filter)
        if eff_group:
            filt_q_t = filt_q_t.join(Branch, Branch.id == ParticipationData.branch_id).where(Branch.group_id == eff_group)
            filt_q_p = filt_q_p.join(Branch, Branch.id == ParticipationData.branch_id).where(Branch.group_id == eff_group)
        elif eff_branch:
            filt_q_t = filt_q_t.where(ParticipationData.branch_id == eff_branch)
            filt_q_p = filt_q_p.where(ParticipationData.branch_id == eff_branch)
        rf_t = await session.scalar(filt_q_t)
        rf_p = await session.scalar(filt_q_p)

        baseline_series.append({"x": label, "rate": _rate(rb_t or 0, rb_p or 0)})
        filtered_series.append({"x": label, "rate": _rate(rf_t or 0, rf_p or 0)})

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
