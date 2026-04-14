"""NPS 집계 API — §5.3 스펙 기반."""
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_user, get_data_filter, get_session
from app.db.models import Branch, NpsData
from app.services.month_window import recent_months

router = APIRouter(prefix="/nps", tags=["NPS"])


def _calc_nps(vs, s, n, d, vd) -> Optional[float]:
    total = vs + s + n + d + vd
    if not total:
        return None
    return round((vs / total - (d + vd) / total) * 100, 1)


def _pct(val: int, total: int) -> Optional[float]:
    return round(val / total * 100, 1) if total else None


NPS_LEVEL_KEYS = {
    "all":            ("very_satisfied_pct", "satisfied_pct", "below_normal_pct"),
    "very_satisfied": ("very_satisfied_pct",),
    "satisfied":      ("satisfied_pct",),
    "below_normal":   ("below_normal_pct",),
}


@router.get("/summary")
async def get_nps_summary(
    months: int = Query(default=6, ge=1, le=24),
    group_id: Optional[int] = Query(default=None),
    branch_id: Optional[int] = Query(default=None),
    nps_level: str = Query(default="all", pattern="^(all|very_satisfied|satisfied|below_normal)$"),
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

        def _q(filtered=False):
            q = select(
                func.sum(NpsData.very_satisfied).label("vs"),
                func.sum(NpsData.satisfied).label("s"),
                func.sum(NpsData.normal).label("n"),
                func.sum(NpsData.dissatisfied).label("d"),
                func.sum(NpsData.very_dissatisfied).label("vd"),
            ).where(NpsData.year == year, NpsData.month == month)
            if filtered:
                if eff_group:
                    q = q.join(Branch, Branch.id == NpsData.branch_id).where(Branch.group_id == eff_group)
                elif eff_branch:
                    q = q.where(NpsData.branch_id == eff_branch)
            return q

        rb = (await session.exec(_q(False))).first()
        rf = (await session.exec(_q(True))).first()

        vs_b, s_b, n_b, d_b, vd_b = (rb.vs or 0, rb.s or 0, rb.n or 0, rb.d or 0, rb.vd or 0)
        vs_f, s_f, n_f, d_f, vd_f = (rf.vs or 0, rf.s or 0, rf.n or 0, rf.d or 0, rf.vd or 0)

        total_b = vs_b + s_b + n_b + d_b + vd_b
        total_f = vs_f + s_f + n_f + d_f + vd_f
        below_b = n_b + d_b + vd_b
        below_f = n_f + d_f + vd_f

        all_b = {
            "very_satisfied_pct": _pct(vs_b, total_b),
            "satisfied_pct": _pct(s_b, total_b),
            "below_normal_pct": _pct(below_b, total_b),
        }
        all_f = {
            "very_satisfied_pct": _pct(vs_f, total_f),
            "satisfied_pct": _pct(s_f, total_f),
            "below_normal_pct": _pct(below_f, total_f),
        }
        keys = NPS_LEVEL_KEYS.get(nps_level, NPS_LEVEL_KEYS["all"])
        baseline_series.append({"x": label, **{k: all_b[k] for k in keys}})
        filtered_series.append({"x": label, **{k: all_f[k] for k in keys}})

    # 최신 월 스코어카드
    scorecard = {}
    if period:
        year, month = period[-1]
        q = select(
            func.sum(NpsData.very_satisfied).label("vs"),
            func.sum(NpsData.satisfied).label("s"),
            func.sum(NpsData.normal).label("n"),
            func.sum(NpsData.dissatisfied).label("d"),
            func.sum(NpsData.very_dissatisfied).label("vd"),
        ).where(NpsData.year == year, NpsData.month == month)
        if eff_group:
            q = q.join(Branch, Branch.id == NpsData.branch_id).where(Branch.group_id == eff_group)
        elif eff_branch:
            q = q.where(NpsData.branch_id == eff_branch)
        r = (await session.exec(q)).first()
        vs, s, n, d, vd = (r.vs or 0, r.s or 0, r.n or 0, r.d or 0, r.vd or 0)
        total = vs + s + n + d + vd
        below = n + d + vd
        scorecard = {
            "very_satisfied":  {"count": vs,    "pct": _pct(vs, total)},
            "satisfied":       {"count": s,     "pct": _pct(s, total)},
            "below_normal":    {"count": below, "pct": _pct(below, total)},
        }

    return {
        "scorecard": scorecard,
        "chart": {
            "series": [
                {"label": "기준값", "type": "line", "data": baseline_series},
                {"label": "필터값", "type": "line", "data": filtered_series},
            ]
        },
    }
