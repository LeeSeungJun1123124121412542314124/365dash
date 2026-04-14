"""칭찬 집계 API."""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_user, get_session
from app.db.models import Branch, PraiseData
from app.schemas.common import ChartPoint, ScoreCard
from app.services.month_window import recent_months

router = APIRouter(prefix="/praise", tags=["칭찬"])


@router.get("/summary")
async def get_praise_summary(
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
            func.sum(PraiseData.surgery_count + PraiseData.lams_count + PraiseData.lams_surgery_count).label("total")
        ).where(PraiseData.year == year, PraiseData.month == month)
        b = (await session.exec(q_base)).first()

        # 필터값
        q_filter = select(
            func.sum(PraiseData.surgery_count + PraiseData.lams_count + PraiseData.lams_surgery_count).label("total")
        ).where(PraiseData.year == year, PraiseData.month == month)
        if group_id:
            q_filter = q_filter.join(Branch, Branch.id == PraiseData.branch_id).where(Branch.group_id == group_id)
        if branch_id:
            q_filter = q_filter.where(PraiseData.branch_id == branch_id)
        f = (await session.exec(q_filter)).first()

        chart.append(ChartPoint(
            label=f"{month}월",
            baseline=float(b.total) if b.total else 0,
            value=float(f.total) if f.total else 0,
        ))

    # 최신 월 스코어카드
    latest_period = period[-1] if period else None
    scorecards = {}
    if latest_period:
        year, month = latest_period
        q = select(
            func.sum(PraiseData.surgery_count).label("surgery"),
            func.sum(PraiseData.lams_count).label("lams"),
            func.sum(PraiseData.lams_surgery_count).label("lams_surgery"),
        ).where(PraiseData.year == year, PraiseData.month == month)
        q_base2 = q  # 기준값
        if group_id:
            q = q.join(Branch, Branch.id == PraiseData.branch_id).where(Branch.group_id == group_id)
        if branch_id:
            q = q.where(PraiseData.branch_id == branch_id)

        rb = (await session.exec(q_base2)).first()
        rf = (await session.exec(q)).first()

        base_total = (rb.surgery or 0) + (rb.lams or 0) + (rb.lams_surgery or 0)
        filter_total = (rf.surgery or 0) + (rf.lams or 0) + (rf.lams_surgery or 0)

        prev_val = chart[-2].value if len(chart) >= 2 else None
        change = round(filter_total - prev_val, 1) if prev_val is not None else None

        scorecards = {
            "base_total": ScoreCard(label="기준값 칭찬총계", value=base_total, unit="건"),
            "filter_total": ScoreCard(label="필터값 칭찬총계", value=filter_total, unit="건", change=change),
            "surgery": ScoreCard(label="수술 칭찬", value=rf.surgery or 0, unit="건"),
            "lams_surgery": ScoreCard(label="람스+시술 칭찬", value=rf.lams_surgery or 0, unit="건"),
        }

    return {"scorecards": scorecards, "trend": chart}
