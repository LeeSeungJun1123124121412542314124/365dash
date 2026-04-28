"""불만 집계 API — 대분류(group) 단위 집계."""
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_user, get_data_filter, get_session
from app.db.models import BranchGroup, ComplaintData
from app.services.month_window import months_in_range

router = APIRouter(prefix="/complaint", tags=["불만"])

CATEGORY_KEY = {
    "hospital":     "surgery_complaint",
    "lams_surgery": "lams_surgery_complaint",
    "lams":         "lams_complaint",
    "etc":          "etc_complaint",
}


async def _sum_by_group(
    session: AsyncSession,
    year: int,
    month: int,
    eff_group: Optional[int],
) -> dict:
    """월별 불만 개수를 대분류별로 집계."""
    q = (
        select(
            BranchGroup.category.label("cat"),
            func.coalesce(func.sum(ComplaintData.count), 0).label("cnt"),
        )
        .join(BranchGroup, BranchGroup.id == ComplaintData.group_id)
        .where(ComplaintData.year == year, ComplaintData.month == month)
    )
    if eff_group:
        q = q.where(ComplaintData.group_id == eff_group)
    q = q.group_by(BranchGroup.category)

    rows = (await session.exec(q)).all()
    result = {"total": 0, "surgery_complaint": 0, "lams_complaint": 0,
              "lams_surgery_complaint": 0, "etc_complaint": 0}
    for r in rows:
        key = CATEGORY_KEY.get(r.cat, "etc_complaint")
        result[key] = int(r.cnt)
        result["total"] += int(r.cnt)
    return result


@router.get("/summary")
async def get_complaint_summary(
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
    eff_group = perm["group_id"] if perm["group_id"] is not None else group_id

    period = months_in_range(start_year, start_month, end_year, end_month)
    baseline_series = []
    filtered_series = []

    for year, month in period:
        label = f"{year}-{month:02d}"
        base = await _sum_by_group(session, year, month, None)
        filt = await _sum_by_group(session, year, month, eff_group)
        baseline_series.append({"x": label, **base})
        filtered_series.append({"x": label, **filt})

    # 기간 합계 스코어카드
    return {
        "scorecard": {
            "baseline_total": sum(s["total"] for s in baseline_series),
            "filtered_total": sum(s["total"] for s in filtered_series),
        },
        "chart": {
            "series": [
                {"label": "기준값", "type": "bar", "data": baseline_series},
                {"label": "필터값", "type": "bar", "data": filtered_series},
            ]
        },
    }


@router.get("/keywords")
async def get_complaint_keywords(
    start_year: int = Query(default=2000, ge=2000, le=2100),
    start_month: int = Query(default=1, ge=1, le=12),
    end_year: int = Query(default=2100, ge=2000, le=2100),
    end_month: int = Query(default=12, ge=1, le=12),
    group_id: Optional[int] = Query(default=None),
    branch_id: Optional[int] = Query(default=None),
    user: Annotated[dict, Depends(get_current_user)] = None,
    session: Annotated[AsyncSession, Depends(get_session)] = None,
):
    """키워드별 불만 집계 테이블 (기간 범위 필터)."""
    perm = get_data_filter(user)
    eff_group = perm["group_id"] if perm["group_id"] is not None else group_id

    start_ym = start_year * 100 + start_month
    end_ym = end_year * 100 + end_month

    q = (
        select(
            ComplaintData.year,
            ComplaintData.month,
            BranchGroup.name.label("group_name"),
            ComplaintData.keyword,
            func.coalesce(func.sum(ComplaintData.count), 0).label("cnt"),
        )
        .join(BranchGroup, BranchGroup.id == ComplaintData.group_id)
        .where(
            (ComplaintData.year * 100 + ComplaintData.month) >= start_ym,
            (ComplaintData.year * 100 + ComplaintData.month) <= end_ym,
        )
    )

    if eff_group:
        q = q.where(ComplaintData.group_id == eff_group)

    q = q.group_by(
        ComplaintData.year, ComplaintData.month,
        BranchGroup.name, ComplaintData.keyword,
    ).order_by(ComplaintData.year.desc(), ComplaintData.month.desc(), BranchGroup.name)

    rows = (await session.exec(q)).all()

    return {
        "rows": [
            {
                "year": r.year,
                "month": r.month,
                "group_name": r.group_name,
                "keyword": r.keyword,
                "count": int(r.cnt),
            }
            for r in rows
        ]
    }
