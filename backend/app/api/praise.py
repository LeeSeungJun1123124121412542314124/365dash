"""칭찬 집계 API."""
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_user, get_data_filter, get_session
from app.db.models import Branch, PraiseData
from app.schemas.common import ChartPoint, ScoreCard
from app.services.month_window import recent_months

router = APIRouter(prefix="/praise", tags=["칭찬"])

_TOTAL = PraiseData.surgery_count + PraiseData.lams_count + PraiseData.lams_surgery_count


def _apply_filter(q, eff_group, eff_branch):
    if eff_group:
        return q.join(Branch, Branch.id == PraiseData.branch_id).where(Branch.group_id == eff_group)
    elif eff_branch:
        return q.where(PraiseData.branch_id == eff_branch)
    return q


@router.get("/summary")
async def get_praise_summary(
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
        w = (PraiseData.year == year, PraiseData.month == month)
        rb = (await session.exec(select(func.sum(_TOTAL).label("t")).where(*w))).first()
        rf = (await session.exec(
            _apply_filter(select(func.sum(_TOTAL).label("t")).where(*w), eff_group, eff_branch)
        )).first()
        chart.append(ChartPoint(label=f"{month}월", baseline=float(rb.t or 0), value=float(rf.t or 0)))

    # 최신 월 스코어카드
    scorecards = {}
    if period:
        year, month = period[-1]
        w = (PraiseData.year == year, PraiseData.month == month)
        q_detail = select(
            func.sum(PraiseData.surgery_count).label("surgery"),
            func.sum(PraiseData.lams_count).label("lams"),
            func.sum(PraiseData.lams_surgery_count).label("lams_surgery"),
        ).where(*w)
        rb = (await session.exec(q_detail)).first()
        rf = (await session.exec(_apply_filter(q_detail, eff_group, eff_branch))).first()

        base_total   = (rb.surgery or 0) + (rb.lams or 0) + (rb.lams_surgery or 0)
        filter_total = (rf.surgery or 0) + (rf.lams or 0) + (rf.lams_surgery or 0)
        prev_val = chart[-2].value if len(chart) >= 2 else None
        change = round(filter_total - prev_val, 1) if prev_val is not None else None

        scorecards = {
            "base_total":   ScoreCard(label="기준값 칭찬총계", value=base_total,   unit="건"),
            "filter_total": ScoreCard(label="필터값 칭찬총계", value=filter_total, unit="건", change=change),
            "surgery":      ScoreCard(label="수술 칭찬",       value=rf.surgery or 0,      unit="건"),
            "lams_surgery": ScoreCard(label="람스+시술 칭찬",  value=rf.lams_surgery or 0, unit="건"),
        }

    return {"scorecards": scorecards, "trend": chart}
