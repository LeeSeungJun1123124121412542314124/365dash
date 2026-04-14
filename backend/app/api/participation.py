"""참여율 집계 API."""
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_user, get_session
from app.db.models import Branch, BranchGroup, ParticipationData
from app.schemas.common import ChartPoint, ScoreCard
from app.services.month_window import recent_months

router = APIRouter(prefix="/participation", tags=["참여율"])


def _participation_rate(target: int, participant: int) -> Optional[float]:
    if not target:
        return None
    return round(participant * 100.0 / target, 1)


@router.get("/summary")
async def get_participation_summary(
    months: int = Query(default=6, ge=1, le=24),
    group_id: Optional[int] = Query(default=None),
    branch_id: Optional[int] = Query(default=None),
    user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """스코어카드 + 추이 차트 데이터."""
    period = recent_months(months)  # [(year, month), ...]

    # 기준값: 전체 / 필터값: 선택된 그룹 or 지점
    rows_base = []
    rows_filter = []

    for year, month in period:
        # 기준값 쿼리 (전체 집계)
        q_base = (
            select(
                func.sum(ParticipationData.target_count).label("target"),
                func.sum(ParticipationData.participant_count).label("participant"),
            )
            .where(ParticipationData.year == year, ParticipationData.month == month)
        )
        res_base = (await session.exec(q_base)).first()
        target_b = res_base.target or 0
        part_b = res_base.participant or 0

        # 필터값 쿼리
        q_filter = (
            select(
                func.sum(ParticipationData.target_count).label("target"),
                func.sum(ParticipationData.participant_count).label("participant"),
            )
            .where(ParticipationData.year == year, ParticipationData.month == month)
        )
        if group_id:
            q_filter = q_filter.join(Branch, Branch.id == ParticipationData.branch_id).where(
                Branch.group_id == group_id
            )
        if branch_id:
            q_filter = q_filter.where(ParticipationData.branch_id == branch_id)

        res_filter = (await session.exec(q_filter)).first()
        target_f = res_filter.target or 0
        part_f = res_filter.participant or 0

        label = f"{month}월"
        rows_base.append(ChartPoint(
            label=label,
            baseline=_participation_rate(target_b, part_b),
        ))
        rows_filter.append(ChartPoint(
            label=label,
            value=_participation_rate(target_f, part_f),
        ))

    # 최신 월 스코어카드
    latest = rows_filter[-1] if rows_filter else None
    prev = rows_filter[-2] if len(rows_filter) >= 2 else None
    current_val = latest.value if latest else None
    prev_val = prev.value if prev else None
    change = None
    if current_val is not None and prev_val:
        change = round(current_val - prev_val, 1)

    # 차트: 기준값과 필터값 합치기
    chart = [
        ChartPoint(label=b.label, baseline=b.baseline, value=f.value)
        for b, f in zip(rows_base, rows_filter)
    ]

    return {
        "scorecard": ScoreCard(
            label="이번달 참여율",
            value=current_val,
            unit="%",
            change=change,
        ),
        "trend": chart,
    }
