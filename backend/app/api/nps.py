"""NPS 집계 API."""
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_user, get_session
from app.db.models import Branch, NpsData
from app.schemas.common import ChartPoint, ScoreCard
from app.services.month_window import recent_months

router = APIRouter(prefix="/nps", tags=["NPS"])


def _calc_nps(very_satisfied: int, satisfied: int, neutral: int,
              dissatisfied: int, very_dissatisfied: int) -> Optional[float]:
    """NPS = 매우만족% - (불만족+매우불만족%)."""
    total = very_satisfied + satisfied + neutral + dissatisfied + very_dissatisfied
    if not total:
        return None
    promoters = very_satisfied / total * 100
    detractors = (dissatisfied + very_dissatisfied) / total * 100
    return round(promoters - detractors, 1)


@router.get("/summary")
async def get_nps_summary(
    months: int = Query(default=6, ge=1, le=24),
    group_id: Optional[int] = Query(default=None),
    branch_id: Optional[int] = Query(default=None),
    user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    period = recent_months(months)
    chart = []

    for year, month in period:
        # 기준값 (전체)
        q_base = select(
            func.sum(NpsData.very_satisfied).label("vs"),
            func.sum(NpsData.satisfied).label("s"),
            func.sum(NpsData.neutral).label("n"),
            func.sum(NpsData.dissatisfied).label("d"),
            func.sum(NpsData.very_dissatisfied).label("vd"),
        ).where(NpsData.year == year, NpsData.month == month)
        b = (await session.exec(q_base)).first()

        # 필터값
        q_filter = select(
            func.sum(NpsData.very_satisfied).label("vs"),
            func.sum(NpsData.satisfied).label("s"),
            func.sum(NpsData.neutral).label("n"),
            func.sum(NpsData.dissatisfied).label("d"),
            func.sum(NpsData.very_dissatisfied).label("vd"),
        ).where(NpsData.year == year, NpsData.month == month)
        if group_id:
            q_filter = q_filter.join(Branch, Branch.id == NpsData.branch_id).where(
                Branch.group_id == group_id
            )
        if branch_id:
            q_filter = q_filter.where(NpsData.branch_id == branch_id)
        f = (await session.exec(q_filter)).first()

        label = f"{month}월"
        baseline = _calc_nps(b.vs or 0, b.s or 0, b.n or 0, b.d or 0, b.vd or 0)
        value = _calc_nps(f.vs or 0, f.s or 0, f.n or 0, f.d or 0, f.vd or 0)
        chart.append(ChartPoint(label=label, baseline=baseline, value=value))

    # 최신 월 스코어카드 (필터값 기준)
    latest_f = chart[-1].value if chart else None
    prev_f = chart[-2].value if len(chart) >= 2 else None
    change = None
    if latest_f is not None and prev_f is not None:
        change = round(latest_f - prev_f, 1)

    # 최신 월 만족도 건수 (필터값)
    latest_period = period[-1] if period else None
    scorecard_counts = {}
    if latest_period:
        year, month = latest_period
        q = select(
            func.sum(NpsData.very_satisfied).label("vs"),
            func.sum(NpsData.satisfied).label("s"),
            func.sum(NpsData.neutral).label("n"),
            func.sum(NpsData.dissatisfied).label("d"),
            func.sum(NpsData.very_dissatisfied).label("vd"),
        ).where(NpsData.year == year, NpsData.month == month)
        if group_id:
            q = q.join(Branch, Branch.id == NpsData.branch_id).where(Branch.group_id == group_id)
        if branch_id:
            q = q.where(NpsData.branch_id == branch_id)
        row = (await session.exec(q)).first()
        total = sum([(row.vs or 0), (row.s or 0), (row.n or 0), (row.d or 0), (row.vd or 0)])
        def pct(v): return round((v or 0) / total * 100, 1) if total else None
        scorecard_counts = {
            "very_satisfied": {"count": row.vs or 0, "pct": pct(row.vs)},
            "satisfied": {"count": row.s or 0, "pct": pct(row.s)},
            "below_average": {
                "count": (row.n or 0) + (row.d or 0) + (row.vd or 0),
                "pct": pct((row.n or 0) + (row.d or 0) + (row.vd or 0)),
            },
            "nps_score": latest_f,
        }

    return {
        "scorecard": ScoreCard(label="NPS", value=latest_f, unit="점", change=change),
        "scorecard_counts": scorecard_counts,
        "trend": chart,
    }
