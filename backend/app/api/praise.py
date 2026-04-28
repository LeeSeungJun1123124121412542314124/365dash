"""칭찬 집계 API — §5.4 스펙 기반."""
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_user, get_data_filter, get_session
from app.db.models import Branch, BranchGroup, PraiseData
from app.services.month_window import months_in_range

router = APIRouter(prefix="/praise", tags=["칭찬"])

CATEGORY_KEY = {
    "hospital":      "surgery",
    "lams_surgery":  "lams_surgery",
    "lams":          "lams",
}

_EMPTY = {"total": 0, "surgery": 0, "lams": 0, "lams_surgery": 0}


def _rows_to_map(rows) -> dict:
    result = {}
    for r in rows:
        key = (r.year, r.month)
        if key not in result:
            result[key] = {"total": 0, "surgery": 0, "lams": 0, "lams_surgery": 0}
        cat_key = CATEGORY_KEY.get(r.cat, "lams")
        result[key][cat_key] = int(r.cnt)
        result[key]["total"] += int(r.cnt)
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

    start_ym = start_year * 100 + start_month
    end_ym   = end_year * 100 + end_month
    period   = months_in_range(start_year, start_month, end_year, end_month)

    def _build_q(eff_grp, eff_br):
        q = (
            select(
                PraiseData.year, PraiseData.month,
                BranchGroup.category.label("cat"),
                func.coalesce(func.sum(PraiseData.count), 0).label("cnt"),
            )
            .join(Branch, Branch.id == PraiseData.branch_id)
            .join(BranchGroup, BranchGroup.id == Branch.group_id)
            .where(
                (PraiseData.year * 100 + PraiseData.month) >= start_ym,
                (PraiseData.year * 100 + PraiseData.month) <= end_ym,
            )
        )
        if eff_grp:
            q = q.where(Branch.group_id == eff_grp)
        elif eff_br:
            q = q.where(PraiseData.branch_id == eff_br)
        return q.group_by(PraiseData.year, PraiseData.month, BranchGroup.category)

    base_map = _rows_to_map((await session.exec(_build_q(None, None))).all())
    filt_map = _rows_to_map((await session.exec(_build_q(eff_group, eff_branch))).all())

    baseline_series = []
    filtered_series = []

    for year, month in period:
        label = f"{year}-{month:02d}"
        base = base_map.get((year, month), _EMPTY)
        filt = filt_map.get((year, month), _EMPTY)
        baseline_series.append({"x": label, **base})
        filtered_series.append({"x": label, **filt})

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
