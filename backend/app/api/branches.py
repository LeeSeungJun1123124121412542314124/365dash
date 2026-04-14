"""지점/그룹 목록 API — FilterBar 드롭다운용."""
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_user, get_session
from app.db.models import Branch, BranchGroup

router = APIRouter(prefix="/branches", tags=["지점"])


@router.get("/groups")
async def list_groups(
    user: Annotated[dict, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    groups = (await session.exec(select(BranchGroup).order_by(BranchGroup.id))).all()
    return [{"id": g.id, "name": g.name, "code": g.code} for g in groups]


@router.get("")
async def list_branches(
    group_id: int | None = None,
    user: Annotated[dict, Depends(get_current_user)] = None,
    session: Annotated[AsyncSession, Depends(get_session)] = None,
):
    q = select(Branch, BranchGroup).join(BranchGroup, BranchGroup.id == Branch.group_id)
    if group_id:
        q = q.where(Branch.group_id == group_id)
    q = q.order_by(BranchGroup.id, Branch.name)
    rows = (await session.exec(q)).all()
    return [
        {"id": b.id, "name": b.name, "code": b.code, "group_id": b.group_id, "group_name": g.name}
        for b, g in rows
    ]
