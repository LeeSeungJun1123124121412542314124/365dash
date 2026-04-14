"""사용자 관리 API (admin 전용)."""
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import AdminOnly, get_session
from app.core.security import hash_password
from app.db.models import User

router = APIRouter(prefix="/users", tags=["사용자 관리"])

ROLES = ["admin", "general_manager", "branch_manager", "staff"]


class UserCreate(BaseModel):
    username: str
    password: str
    display_name: str
    role: str
    branch_id: Optional[int] = None
    group_id: Optional[int] = None


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    role: Optional[str] = None
    branch_id: Optional[int] = None
    group_id: Optional[int] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None  # 비어있으면 변경 안 함


@router.get("")
async def list_users(
    _=AdminOnly,
    session: Annotated[AsyncSession, Depends(get_session)] = None,
):
    users = (await session.exec(select(User).order_by(User.id))).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "display_name": u.display_name,
            "role": u.role,
            "branch_id": u.branch_id,
            "group_id": u.group_id,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat(),
        }
        for u in users
    ]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreate,
    _=AdminOnly,
    session: Annotated[AsyncSession, Depends(get_session)] = None,
):
    if body.role not in ROLES:
        raise HTTPException(400, detail=f"유효하지 않은 role: {body.role}")

    existing = (await session.exec(select(User).where(User.username == body.username))).first()
    if existing:
        raise HTTPException(400, detail="이미 존재하는 아이디입니다.")

    user = User(
        username=body.username,
        hashed_password=hash_password(body.password),
        display_name=body.display_name,
        role=body.role,
        branch_id=body.branch_id,
        group_id=body.group_id,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return {"id": user.id, "username": user.username}


@router.patch("/{user_id}")
async def update_user(
    user_id: int,
    body: UserUpdate,
    _=AdminOnly,
    session: Annotated[AsyncSession, Depends(get_session)] = None,
):
    user = (await session.exec(select(User).where(User.id == user_id))).first()
    if not user:
        raise HTTPException(404, detail="사용자를 찾을 수 없습니다.")

    if body.display_name is not None:
        user.display_name = body.display_name
    if body.role is not None:
        if body.role not in ROLES:
            raise HTTPException(400, detail=f"유효하지 않은 role: {body.role}")
        user.role = body.role
    if body.branch_id is not None:
        user.branch_id = body.branch_id
    if body.group_id is not None:
        user.group_id = body.group_id
    if body.is_active is not None:
        user.is_active = body.is_active
    if body.password:
        user.hashed_password = hash_password(body.password)

    session.add(user)
    await session.commit()
    return {"ok": True}


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    _=AdminOnly,
    session: Annotated[AsyncSession, Depends(get_session)] = None,
):
    user = (await session.exec(select(User).where(User.id == user_id))).first()
    if not user:
        raise HTTPException(404, detail="사용자를 찾을 수 없습니다.")
    await session.delete(user)
    await session.commit()
