"""칭찬 집계 API — §5.4 스펙 기반."""
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_user, get_data_filter, get_session
from app.db.models import Branch, BranchGroup, PraiseData
from app.services.month_window import months_in_range

router = APIRouter(prefix="/praise", tags=["칭찬"])

# BranchGroup category → 소계 키 매핑
CATEGORY_KEY = {
    "hospital":      "surgery",       # 병원급 (G1)
    "lams_surgery":  "lams_surgery",  # 람스+시술 (G2)
    "lams":          "lams",          # 람스 (G3)
}


def _apply_filter(q, eff_group, eff_branch):
    if eff_group:
        return q.where(Branch.group_id == eff_group)
    elif eff_branch:
        return q.where(PraiseData.branch_id == eff_branch)
    return q


async def _count_by_group(
    session: AsyncSession,
    year: int,
    month: int,
    eff_group: Optional[int],
    eff_branch: Optional[int],
) -> dict:
    """월별 칭찬 건수를 지점군별로 집계."""
    q = (
        select(
            BranchGroup.category.label("cat"),
            func.count(PraiseData.id).label("cnt"),
        )
        .join(Branch, Branch.id == PraiseData.branch_id)
        .join(BranchGroup, BranchGroup.id == Branch.group_id)
        .where(PraiseData.year == year, PraiseData.month == month)
    )
    q = _apply_filter(q, eff_group, eff_branch)
    q = q.group_by(BranchGroup.category)

    rows = (await session.exec(q)).all()
    result = {"total": 0, "surgery": 0, "lams": 0, "lams_surgery": 0}
    for r in rows:
        key = CATEGORY_KEY.get(r.cat, "lams")
        result[key] = r.cnt
        result["total"] += r.cnt
    return result


@router.get("/summary")
async def get_praise_summary(
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

    period = months_in_range(start_year, start_month, end_year, end_month)
    baseline_series = []
    filtered_series = []

    for year, month in period:
        label = f"{year}-{month:02d}"
        base = await _count_by_group(session, year, month, None, None)
        filt = await _count_by_group(session, year, month, eff_group, eff_branch)
        baseline_series.append({"x": label, "total": base["total"],
                                 "surgery": base["surgery"],
                                 "lams": base["lams"],
                                 "lams_surgery": base["lams_surgery"]})
        filtered_series.append({"x": label, "total": filt["total"],
                                 "surgery": filt["surgery"],
                                 "lams": filt["lams"],
                                 "lams_surgery": filt["lams_surgery"]})

    # 최신 월 스코어카드
    latest_base = baseline_series[-1] if baseline_series else {}
    latest_filt = filtered_series[-1] if filtered_series else {}

    return {
        "scorecard": {
            "baseline_total": latest_base.get("total", 0),
            "filtered_total": latest_filt.get("total", 0),
        },
        "chart": {
            "series": [
                {"label": "기준값", "type": "bar", "data": baseline_series},
                {"label": "필터값", "type": "bar", "data": filtered_series},
            ]
        },
    }
