"""NPS 집계 API."""
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_user, get_data_filter, get_session
from app.db.models import Branch, NpsData
from app.schemas.common import ChartPoint, ScoreCard
from app.services.month_window import recent_months

router = APIRouter(prefix="/nps", tags=["NPS"])


def _calc_nps(vs, s, n, d, vd) -> Optional[float]:
    total = vs + s + n + d + vd
    if not total:
        return None
    return round((vs / total - (d + vd) / total) * 100, 1)


@router.get("/summary")
async def get_nps_summary(
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
    chart = []

    for year, month in period:
        def _q(filtered=False):
            q = select(
                func.sum(NpsData.very_satisfied).label("vs"),
                func.sum(NpsData.satisfied).label("s"),
                func.sum(NpsData.neutral).label("n"),
                func.sum(NpsData.dissatisfied).label("d"),
                func.sum(NpsData.very_dissatisfied).label("vd"),
            ).where(NpsData.year == year, NpsData.month == month)
            if filtered:
                if eff_group:
                    q = q.join(Branch, Branch.id == NpsData.branch_id).where(Branch.group_id == eff_group)
                elif eff_branch:
                    q = q.where(NpsData.branch_id == eff_branch)
            return q

        rb = (await session.exec(_q(False))).first()
        rf = (await session.exec(_q(True))).first()

        chart.append(ChartPoint(
            label=f"{month}월",
            baseline=_calc_nps(rb.vs or 0, rb.s or 0, rb.n or 0, rb.d or 0, rb.vd or 0),
            value=_calc_nps(rf.vs or 0, rf.s or 0, rf.n or 0, rf.d or 0, rf.vd or 0),
        ))

    latest = chart[-1] if chart else None
    prev   = chart[-2] if len(chart) >= 2 else None
    change = None
    if latest and latest.value is not None and prev and prev.value is not None:
        change = round(latest.value - prev.value, 1)

    # 최신 월 건수
    counts = {}
    if period:
        year, month = period[-1]
        q = select(
            func.sum(NpsData.very_satisfied).label("vs"),
            func.sum(NpsData.satisfied).label("s"),
            func.sum(NpsData.neutral).label("n"),
            func.sum(NpsData.dissatisfied).label("d"),
            func.sum(NpsData.very_dissatisfied).label("vd"),
        ).where(NpsData.year == year, NpsData.month == month)
        if eff_group:
            q = q.join(Branch, Branch.id == NpsData.branch_id).where(Branch.group_id == eff_group)
        elif eff_branch:
            q = q.where(NpsData.branch_id == eff_branch)
        r = (await session.exec(q)).first()
        total = sum([r.vs or 0, r.s or 0, r.n or 0, r.d or 0, r.vd or 0])
        def pct(v): return round((v or 0) / total * 100, 1) if total else None
        below = (r.n or 0) + (r.d or 0) + (r.vd or 0)
        counts = {
            "very_satisfied":  {"count": r.vs or 0, "pct": pct(r.vs)},
            "satisfied":       {"count": r.s  or 0, "pct": pct(r.s)},
            "below_average":   {"count": below,      "pct": pct(below)},
            "nps_score":       latest.value if latest else None,
        }

    return {
        "scorecard": ScoreCard(label="NPS", value=latest.value if latest else None, unit="점", change=change),
        "scorecard_counts": counts,
        "trend": chart,
    }
