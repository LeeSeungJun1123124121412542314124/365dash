"""참여율 집계 API — §5.2 스펙 기반."""
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_user, get_data_filter, get_session
from app.db.models import Branch, ParticipationData
from app.services.month_window import months_in_range

router = APIRouter(prefix="/participation", tags=["참여율"])


def _rate(target: int, participant: int) -> Optional[float]:
    return round(participant * 100.0 / target, 1) if target else None


@router.get("/summary")
async def get_participation_summary(
    start_year: int = Query(default=2019, ge=2000, le=2100),
    start_month: int = Query(default=1, ge=1, le=12),
    end_year: int = Query(default=2019, ge=2000, le=2100),
    end_month: int = Query(default=12, ge=1, le=12),
    group_id: Optional[int] = Query(default=None),
    branch_id: Optional[int] = Query(default=None),
    user: Annotated[dict, Depends(get_current_user)] = None,
    session: Annotated[AsyncSession, Depends(get_session)] = None,
):
    perm = get_data_filter(user)
    eff_group  = perm["group_id"]  if perm["group_id"]  is not None else group_id
    eff_branch = perm["branch_id"] if perm["branch_id"] is not None else branch_id

    period = months_in_range(start_year, start_month, end_year, end_month)
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

    # 기간 평균 스코어카드
    base_rates = [s["rate"] for s in baseline_series if s["rate"] is not None]
    filt_rates = [s["rate"] for s in filtered_series if s["rate"] is not None]
    baseline_avg = round(sum(base_rates) / len(base_rates), 1) if base_rates else None
    filtered_avg = round(sum(filt_rates) / len(filt_rates), 1) if filt_rates else None

    return {
        "scorecard": {
            "baseline_avg_rate": baseline_avg,
            "filtered_avg_rate": filtered_avg,
        },
        "chart": {
            "series": [
                {"label": "기준값 (전체)", "type": "line", "data": baseline_series},
                {"label": "필터값 (선택 지점/군)", "type": "line", "data": filtered_series},
            ]
        },
    }
