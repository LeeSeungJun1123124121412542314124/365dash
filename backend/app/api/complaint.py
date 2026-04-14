"""불만 집계 API."""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_user, get_session
from app.db.models import Branch, BranchGroup, ComplaintData
from app.schemas.common import ChartPoint, ScoreCard
from app.services.month_window import recent_months

router = APIRouter(prefix="/complaint", tags=["불만"])

CATEGORY_FIELDS = ["parking", "guidance", "waiting", "rudeness", "system", "privacy", "environment", "other"]
CATEGORY_KR = {
    "parking": "주차",
    "guidance": "안내·응대부족",
    "waiting": "대기관련",
    "rudeness": "불친절",
    "system": "시스템불만",
    "privacy": "개인정보",
    "environment": "환경불만",
    "other": "기타",
}


@router.get("/summary")
async def get_complaint_summary(
    months: int = Query(default=6, ge=1, le=24),
    group_id: Optional[int] = Query(default=None),
    branch_id: Optional[int] = Query(default=None),
    user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """불만 현황 탭1: 스코어카드 + 추이 차트."""
    period = recent_months(months)
    chart = []

    total_col = (
        ComplaintData.surgery_count + ComplaintData.lams_count + ComplaintData.lams_surgery_count
    )

    for year, month in period:
        q_base = select(func.sum(total_col).label("total")).where(
            ComplaintData.year == year, ComplaintData.month == month
        )
        b = (await session.exec(q_base)).first()

        q_filter = select(func.sum(total_col).label("total")).where(
            ComplaintData.year == year, ComplaintData.month == month
        )
        if group_id:
            q_filter = q_filter.join(Branch, Branch.id == ComplaintData.branch_id).where(Branch.group_id == group_id)
        if branch_id:
            q_filter = q_filter.where(ComplaintData.branch_id == branch_id)
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
        q_base2 = select(
            func.sum(ComplaintData.surgery_count).label("surgery"),
            func.sum(ComplaintData.lams_count).label("lams"),
            func.sum(ComplaintData.lams_surgery_count).label("lams_surgery"),
        ).where(ComplaintData.year == year, ComplaintData.month == month)
        q_f = select(
            func.sum(ComplaintData.surgery_count).label("surgery"),
            func.sum(ComplaintData.lams_count).label("lams"),
            func.sum(ComplaintData.lams_surgery_count).label("lams_surgery"),
        ).where(ComplaintData.year == year, ComplaintData.month == month)
        if group_id:
            q_f = q_f.join(Branch, Branch.id == ComplaintData.branch_id).where(Branch.group_id == group_id)
        if branch_id:
            q_f = q_f.where(ComplaintData.branch_id == branch_id)

        rb = (await session.exec(q_base2)).first()
        rf = (await session.exec(q_f)).first()
        base_total = (rb.surgery or 0) + (rb.lams or 0) + (rb.lams_surgery or 0)
        filter_total = (rf.surgery or 0) + (rf.lams or 0) + (rf.lams_surgery or 0)
        prev_val = chart[-2].value if len(chart) >= 2 else None
        change = round(filter_total - prev_val, 1) if prev_val is not None else None

        scorecards = {
            "base_total": ScoreCard(label="기준값 불만총계", value=base_total, unit="건"),
            "filter_total": ScoreCard(label="필터값 불만총계", value=filter_total, unit="건", change=change),
            "surgery": ScoreCard(label="수술 불만", value=rf.surgery or 0, unit="건"),
            "lams_surgery": ScoreCard(label="람스+시술 불만", value=rf.lams_surgery or 0, unit="건"),
        }

    return {"scorecards": scorecards, "trend": chart}


@router.get("/keywords")
async def get_complaint_keywords(
    year: Optional[int] = Query(default=None),
    month: Optional[int] = Query(default=None),
    group_id: Optional[int] = Query(default=None),
    branch_id: Optional[int] = Query(default=None),
    user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """불만 키워드 탭2: 지점별 8개 카테고리 테이블."""
    q = (
        select(
            ComplaintData.year,
            ComplaintData.month,
            Branch.name.label("branch_name"),
            BranchGroup.name.label("group_name"),
            ComplaintData.parking,
            ComplaintData.guidance,
            ComplaintData.waiting,
            ComplaintData.rudeness,
            ComplaintData.system,
            ComplaintData.privacy,
            ComplaintData.environment,
            ComplaintData.other,
        )
        .join(Branch, Branch.id == ComplaintData.branch_id)
        .join(BranchGroup, BranchGroup.id == Branch.group_id)
    )
    if year:
        q = q.where(ComplaintData.year == year)
    if month:
        q = q.where(ComplaintData.month == month)
    if group_id:
        q = q.where(Branch.group_id == group_id)
    if branch_id:
        q = q.where(ComplaintData.branch_id == branch_id)

    q = q.order_by(ComplaintData.year.desc(), ComplaintData.month.desc(), Branch.name)
    rows = (await session.exec(q)).all()

    result = []
    for r in rows:
        result.append({
            "year": r.year,
            "month": r.month,
            "branch_name": r.branch_name,
            "group_name": r.group_name,
            **{CATEGORY_KR[f]: getattr(r, f) for f in CATEGORY_FIELDS},
        })

    return {"rows": result}
