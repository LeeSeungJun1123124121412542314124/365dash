"""메인 대시보드 — §5.1 스펙 기반."""
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_user, get_session
from app.db.models import Branch, ComplaintData, NpsData, ParticipationData, PraiseData
from app.services.month_window import recent_months

router = APIRouter(prefix="/dashboard", tags=["메인 대시보드"])


@router.get("/main")
async def get_main_dashboard(
    months: int = Query(default=6, ge=1, le=24),
    user: Annotated[dict, Depends(get_current_user)] = None,
    session: Annotated[AsyncSession, Depends(get_session)] = None,
):
    period = recent_months(months)

    participation_trend = []
    nps_trend = []
    praise_trend = []
    complaint_trend = []

    for year, month in period:
        label = f"{year}-{month:02d}"

        # 참여율
        pt = await session.scalar(select(func.sum(ParticipationData.target_count)).where(ParticipationData.year == year, ParticipationData.month == month))
        pp = await session.scalar(select(func.sum(ParticipationData.participant_count)).where(ParticipationData.year == year, ParticipationData.month == month))
        rate = round((pp or 0) / pt * 100, 1) if pt else None
        participation_trend.append({"label": label, "rate": rate})

        # NPS
        vs = await session.scalar(select(func.sum(NpsData.very_satisfied)).where(NpsData.year == year, NpsData.month == month)) or 0
        s  = await session.scalar(select(func.sum(NpsData.satisfied)).where(NpsData.year == year, NpsData.month == month)) or 0
        n  = await session.scalar(select(func.sum(NpsData.normal)).where(NpsData.year == year, NpsData.month == month)) or 0
        d  = await session.scalar(select(func.sum(NpsData.dissatisfied)).where(NpsData.year == year, NpsData.month == month)) or 0
        vd = await session.scalar(select(func.sum(NpsData.very_dissatisfied)).where(NpsData.year == year, NpsData.month == month)) or 0
        total = vs + s + n + d + vd
        below = n + d + vd
        nps_trend.append({
            "label": label,
            "very_satisfied_pct": round(vs / total * 100, 1) if total else None,
            "satisfied_pct": round(s / total * 100, 1) if total else None,
            "below_normal_pct": round(below / total * 100, 1) if total else None,
        })

        # 칭찬 (행 단위 COUNT)
        praise_cnt = await session.scalar(select(func.count(PraiseData.id)).where(PraiseData.year == year, PraiseData.month == month))
        praise_trend.append({"label": label, "count": praise_cnt or 0})

        # 불만 (행 단위 COUNT)
        complaint_cnt = await session.scalar(select(func.count(ComplaintData.id)).where(ComplaintData.year == year, ComplaintData.month == month))
        complaint_trend.append({"label": label, "count": complaint_cnt or 0})

    # 스코어카드 — 최근 N개월 평균
    def _avg(values):
        vals = [v for v in values if v is not None]
        return round(sum(vals) / len(vals), 1) if vals else None

    scorecard = {
        "participation_rate_avg": _avg([p["rate"] for p in participation_trend]),
        "nps_very_satisfied_pct": _avg([p["very_satisfied_pct"] for p in nps_trend]),
        "nps_satisfied_pct":      _avg([p["satisfied_pct"] for p in nps_trend]),
        "nps_below_normal_pct":   _avg([p["below_normal_pct"] for p in nps_trend]),
        "praise_count_avg":       _avg([p["count"] for p in praise_trend]),
        "complaint_count_avg":    _avg([p["count"] for p in complaint_trend]),
    }

    return {
        "scorecard": scorecard,
        "charts": {
            "participation_trend": participation_trend,
            "nps_trend": nps_trend,
            "praise_trend": praise_trend,
            "complaint_trend": complaint_trend,
        },
    }
