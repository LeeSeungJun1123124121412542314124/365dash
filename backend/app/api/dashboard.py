"""메인 대시보드 — 최근 6개월 평균 스코어카드 + 4개 추이 그래프."""
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_user, get_session
from app.db.models import Branch, ComplaintData, NpsData, ParticipationData, PraiseData
from app.schemas.common import ChartPoint, ScoreCard
from app.services.month_window import recent_months

router = APIRouter(prefix="/dashboard", tags=["메인 대시보드"])


async def _avg_participation(session: AsyncSession, period: list) -> Optional[float]:
    """최근 N개월 평균 참여율 (전체 기준)."""
    vals = []
    for year, month in period:
        r = (await session.exec(
            select(
                func.sum(ParticipationData.target_count).label("t"),
                func.sum(ParticipationData.participant_count).label("p"),
            ).where(ParticipationData.year == year, ParticipationData.month == month)
        )).first()
        if r.t:
            vals.append(r.p / r.t * 100)
    return round(sum(vals) / len(vals), 1) if vals else None


async def _avg_nps(session: AsyncSession, period: list) -> Optional[float]:
    vals = []
    for year, month in period:
        r = (await session.exec(
            select(
                func.sum(NpsData.very_satisfied).label("vs"),
                func.sum(NpsData.satisfied + NpsData.neutral + NpsData.dissatisfied + NpsData.very_dissatisfied).label("rest"),
                func.sum(NpsData.dissatisfied + NpsData.very_dissatisfied).label("det"),
                func.sum(NpsData.very_satisfied + NpsData.satisfied + NpsData.neutral + NpsData.dissatisfied + NpsData.very_dissatisfied).label("total"),
            ).where(NpsData.year == year, NpsData.month == month)
        )).first()
        if r.total:
            vals.append((r.vs / r.total - r.det / r.total) * 100)
    return round(sum(vals) / len(vals), 1) if vals else None


async def _sum_praise(session: AsyncSession, period: list) -> Optional[int]:
    total = 0
    for year, month in period:
        r = (await session.exec(
            select(func.sum(PraiseData.surgery_count + PraiseData.lams_count + PraiseData.lams_surgery_count).label("t"))
            .where(PraiseData.year == year, PraiseData.month == month)
        )).first()
        total += (r.t or 0)
    return total if total else None


async def _sum_complaint(session: AsyncSession, period: list) -> Optional[int]:
    total = 0
    for year, month in period:
        r = (await session.exec(
            select(func.sum(
                ComplaintData.surgery_count + ComplaintData.lams_count + ComplaintData.lams_surgery_count
            ).label("t"))
            .where(ComplaintData.year == year, ComplaintData.month == month)
        )).first()
        total += (r.t or 0)
    return total if total else None


@router.get("/main")
async def get_main_dashboard(
    months: int = Query(default=6, ge=1, le=24),
    user: Annotated[dict, Depends(get_current_user)] = None,
    session: Annotated[AsyncSession, Depends(get_session)] = None,
):
    period = recent_months(months)

    # 스코어카드 (최근 N개월 평균/합계)
    participation_avg = await _avg_participation(session, period)
    nps_avg = await _avg_nps(session, period)
    praise_sum = await _sum_praise(session, period)
    complaint_sum = await _sum_complaint(session, period)

    # 추이 차트 (월별)
    participation_trend = []
    nps_trend = []
    praise_comparison = []
    complaint_comparison = []

    for year, month in period:
        label = f"{month}월"

        # 참여율
        pr = (await session.exec(
            select(
                func.sum(ParticipationData.target_count).label("t"),
                func.sum(ParticipationData.participant_count).label("p"),
            ).where(ParticipationData.year == year, ParticipationData.month == month)
        )).first()
        rate = round(pr.p / pr.t * 100, 1) if pr.t else None
        participation_trend.append(ChartPoint(label=label, value=rate))

        # NPS
        nr = (await session.exec(
            select(
                func.sum(NpsData.very_satisfied).label("vs"),
                func.sum(NpsData.dissatisfied + NpsData.very_dissatisfied).label("det"),
                func.sum(NpsData.very_satisfied + NpsData.satisfied + NpsData.neutral + NpsData.dissatisfied + NpsData.very_dissatisfied).label("total"),
            ).where(NpsData.year == year, NpsData.month == month)
        )).first()
        nps = round((nr.vs / nr.total - nr.det / nr.total) * 100, 1) if nr.total else None
        nps_trend.append(ChartPoint(label=label, value=nps))

        # 칭찬
        crp = (await session.exec(
            select(func.sum(PraiseData.surgery_count + PraiseData.lams_count + PraiseData.lams_surgery_count).label("t"))
            .where(PraiseData.year == year, PraiseData.month == month)
        )).first()
        praise_comparison.append(ChartPoint(label=label, value=float(crp.t) if crp.t else 0))

        # 불만
        crc = (await session.exec(
            select(func.sum(ComplaintData.surgery_count + ComplaintData.lams_count + ComplaintData.lams_surgery_count).label("t"))
            .where(ComplaintData.year == year, ComplaintData.month == month)
        )).first()
        complaint_comparison.append(ChartPoint(label=label, value=float(crc.t) if crc.t else 0))

    return {
        "scorecards": [
            ScoreCard(label="평균 참여율", value=participation_avg, unit="%"),
            ScoreCard(label="평균 NPS", value=nps_avg, unit="점"),
            ScoreCard(label="칭찬 총계", value=praise_sum, unit="건"),
            ScoreCard(label="불만 총계", value=complaint_sum, unit="건"),
        ],
        "participation_trend": participation_trend,
        "nps_trend": nps_trend,
        "praise_comparison": praise_comparison,
        "complaint_comparison": complaint_comparison,
    }
