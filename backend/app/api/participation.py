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

    start_ym = start_year * 100 + start_month
    end_ym   = end_year * 100 + end_month
    period   = months_in_range(start_year, start_month, end_year, end_month)

    def _base_select():
        return select(
            ParticipationData.year, ParticipationData.month,
            func.sum(ParticipationData.target_count).label("target"),
            func.sum(ParticipationData.participant_count).label("participant"),
        ).where(
            (ParticipationData.year * 100 + ParticipationData.month) >= start_ym,
            (ParticipationData.year * 100 + ParticipationData.month) <= end_ym,
        )

    base_q = _base_select().group_by(ParticipationData.year, ParticipationData.month)

    filt_q = _base_select()
    if eff_group:
        filt_q = filt_q.join(Branch, Branch.id == ParticipationData.branch_id).where(Branch.group_id == eff_group)
    elif eff_branch:
        filt_q = filt_q.where(ParticipationData.branch_id == eff_branch)
    filt_q = filt_q.group_by(ParticipationData.year, ParticipationData.month)

    base_map = {(r.year, r.month): r for r in (await session.exec(base_q)).all()}
    filt_map = {(r.year, r.month): r for r in (await session.exec(filt_q)).all()}

    baseline_series = []
    filtered_series = []

    for yr, mo in period:
        label = f"{yr}-{mo:02d}"
        b = base_map.get((yr, mo))
        f = filt_map.get((yr, mo))
        rb_t = (b.target or 0) if b else 0
        rb_p = (b.participant or 0) if b else 0
        rf_t = (f.target or 0) if f else 0
        rf_p = (f.participant or 0) if f else 0
        baseline_series.append({"x": label, "rate": _rate(rb_t, rb_p)})
        filtered_series.append({"x": label, "rate": _rate(rf_t, rf_p)})

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
