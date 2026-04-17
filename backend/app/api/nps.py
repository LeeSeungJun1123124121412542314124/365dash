"""NPS 집계 API — §5.3 스펙 기반."""
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_user, get_data_filter, get_session
from app.db.models import Branch, NpsData
from app.services.month_window import months_in_range

router = APIRouter(prefix="/nps", tags=["NPS"])


def _pct(val: int, total: int) -> Optional[float]:
    return round(val / total * 100, 1) if total else None


@router.get("/summary")
async def get_nps_summary(
    start_year: int = Query(default=2019, ge=2000, le=2100),
    start_month: int = Query(default=1, ge=1, le=12),
    end_year: int = Query(default=2019, ge=2000, le=2100),
    end_month: int = Query(default=12, ge=1, le=12),
    group_id: Optional[int] = Query(default=None),
    branch_id: Optional[int] = Query(default=None),
    nps_level: str = Query(default="all", pattern="^(all|very_satisfied|satisfied|below_normal)$"),
    user: Annotated[dict, Depends(get_current_user)] = None,
    session: Annotated[AsyncSession, Depends(get_session)] = None,
):
    perm = get_data_filter(user)
    eff_group  = perm["group_id"]  if perm["group_id"]  is not None else group_id
    eff_branch = perm["branch_id"] if perm["branch_id"] is not None else branch_id

    period = months_in_range(start_year, start_month, end_year, end_month)
    baseline_series = []
    filtered_series = []

    # 기간 전체 누적 (스코어카드용)
    acc_b = {"vs": 0, "s": 0, "n": 0, "d": 0, "vd": 0}
    acc_f = {"vs": 0, "s": 0, "n": 0, "d": 0, "vd": 0}

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

        # 누적
        for k, v in zip(["vs","s","n","d","vd"], [vs_b, s_b, n_b, d_b, vd_b]):
            acc_b[k] += v
        for k, v in zip(["vs","s","n","d","vd"], [vs_f, s_f, n_f, d_f, vd_f]):
            acc_f[k] += v

        # series에 3개 pct 항상 포함 (차트 + 테이블용)
        baseline_series.append({
            "x": label,
            "very_satisfied_pct": _pct(vs_b, total_b),
            "satisfied_pct":      _pct(s_b, total_b),
            "below_normal_pct":   _pct(below_b, total_b),
        })
        filtered_series.append({
            "x": label,
            "very_satisfied_pct": _pct(vs_f, total_f),
            "satisfied_pct":      _pct(s_f, total_f),
            "below_normal_pct":   _pct(below_f, total_f),
        })

    # 스코어카드 — 기간 전체 합산
    tb = acc_b["vs"] + acc_b["s"] + acc_b["n"] + acc_b["d"] + acc_b["vd"]
    tf = acc_f["vs"] + acc_f["s"] + acc_f["n"] + acc_f["d"] + acc_f["vd"]
    bel_b = acc_b["n"] + acc_b["d"] + acc_b["vd"]
    bel_f = acc_f["n"] + acc_f["d"] + acc_f["vd"]

    scorecard = {
        "baseline": {
            "very_satisfied": {"count": acc_b["vs"], "pct": _pct(acc_b["vs"], tb)},
            "satisfied":      {"count": acc_b["s"],  "pct": _pct(acc_b["s"],  tb)},
            "below_normal":   {"count": bel_b,       "pct": _pct(bel_b,       tb)},
        },
        "filtered": {
            "very_satisfied": {"count": acc_f["vs"], "pct": _pct(acc_f["vs"], tf)},
            "satisfied":      {"count": acc_f["s"],  "pct": _pct(acc_f["s"],  tf)},
            "below_normal":   {"count": bel_f,       "pct": _pct(bel_f,       tf)},
        },
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
