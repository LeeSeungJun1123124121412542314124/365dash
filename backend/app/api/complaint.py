"""불만 집계 API — §5.5, §5.6 스펙 기반."""
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_user, get_data_filter, get_session
from app.db.models import Branch, BranchGroup, ComplaintData
from app.services.month_window import recent_months

router = APIRouter(prefix="/complaint", tags=["불만"])

CATEGORY_KEY = {
    "hospital":     "surgery_complaint",
    "lams_surgery": "lams_surgery_complaint",
    "lams":         "lams_complaint",
}

CATEGORY_KR = {
    "parking": "주차", "guidance": "안내 응대부족", "waiting": "대기관련",
    "rudeness": "불친절", "system": "시스템불만", "privacy": "개인정보",
    "environment": "환경불만", "other": "기타",
}
CATEGORY_FIELDS = list(CATEGORY_KR.keys())


def _apply_filter(q, eff_group, eff_branch):
    if eff_group:
        return q.where(Branch.group_id == eff_group)
    elif eff_branch:
        return q.where(ComplaintData.branch_id == eff_branch)
    return q


async def _count_by_group(
    session: AsyncSession,
    year: int,
    month: int,
    eff_group: Optional[int],
    eff_branch: Optional[int],
) -> dict:
    q = (
        select(
            BranchGroup.category.label("cat"),
            func.count(ComplaintData.id).label("cnt"),
        )
        .join(Branch, Branch.id == ComplaintData.branch_id)
        .join(BranchGroup, BranchGroup.id == Branch.group_id)
        .where(ComplaintData.year == year, ComplaintData.month == month)
    )
    q = _apply_filter(q, eff_group, eff_branch)
    q = q.group_by(BranchGroup.category)

    rows = (await session.exec(q)).all()
    result = {"total": 0, "surgery_complaint": 0, "lams_complaint": 0, "lams_surgery_complaint": 0}
    for r in rows:
        key = CATEGORY_KEY.get(r.cat, "lams_complaint")
        result[key] = r.cnt
        result["total"] += r.cnt
    return result


@router.get("/summary")
async def get_complaint_summary(
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
    baseline_series = []
    filtered_series = []

    for year, month in period:
        label = f"{year}-{month:02d}"
        base = await _count_by_group(session, year, month, None, None)
        filt = await _count_by_group(session, year, month, eff_group, eff_branch)
        baseline_series.append({"x": label, **base})
        filtered_series.append({"x": label, **filt})

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


@router.get("/keywords")
async def get_complaint_keywords(
    year: Optional[int] = Query(default=None),
    month: Optional[int] = Query(default=None),
    group_id: Optional[int] = Query(default=None),
    branch_id: Optional[int] = Query(default=None),
    user: Annotated[dict, Depends(get_current_user)] = None,
    session: Annotated[AsyncSession, Depends(get_session)] = None,
):
    """§5.6 — 키워드(카테고리별) 집계 테이블."""
    perm = get_data_filter(user)
    eff_group  = perm["group_id"]  if perm["group_id"]  is not None else group_id
    eff_branch = perm["branch_id"] if perm["branch_id"] is not None else branch_id

    # 각 (year, month, branch) 조합별 카테고리 카운트
    q = (
        select(
            ComplaintData.year,
            ComplaintData.month,
            Branch.name.label("branch_name"),
            BranchGroup.name.label("group_name"),
            ComplaintData.category,
            func.count(ComplaintData.id).label("cnt"),
        )
        .join(Branch, Branch.id == ComplaintData.branch_id)
        .join(BranchGroup, BranchGroup.id == Branch.group_id)
    )

    if year:
        q = q.where(ComplaintData.year == year)
    if month:
        q = q.where(ComplaintData.month == month)
    if eff_group:
        q = q.where(Branch.group_id == eff_group)
    elif eff_branch:
        q = q.where(ComplaintData.branch_id == eff_branch)

    q = q.group_by(
        ComplaintData.year, ComplaintData.month,
        Branch.name, BranchGroup.name,
        ComplaintData.category,
    ).order_by(ComplaintData.year.desc(), ComplaintData.month.desc(), Branch.name)

    rows = (await session.exec(q)).all()

    # (year, month, branch_name) 별로 집계
    from collections import defaultdict
    agg: dict[tuple, dict] = defaultdict(lambda: {
        "year": 0, "month": 0, "branch_name": "", "group_name": "",
        **{cat: 0 for cat in CATEGORY_FIELDS},
        "total": 0,
    })

    for r in rows:
        key = (r.year, r.month, r.branch_name)
        d = agg[key]
        d.update({"year": r.year, "month": r.month,
                  "branch_name": r.branch_name, "group_name": r.group_name})
        if r.category in CATEGORY_FIELDS:
            d[r.category] += r.cnt
            d["total"] += r.cnt

    result_rows = []
    for d in agg.values():
        result_rows.append({
            "year": d["year"], "month": d["month"],
            "branch_name": d["branch_name"], "group_name": d["group_name"],
            **{CATEGORY_KR[f]: d[f] for f in CATEGORY_FIELDS},
            "total": d["total"],
        })

    # 정렬 (year desc, month desc, branch_name asc)
    result_rows.sort(key=lambda x: (-x["year"], -x["month"], x["branch_name"]))

    return {"rows": result_rows}
