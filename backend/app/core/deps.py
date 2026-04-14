from typing import Annotated, Optional

from fastapi import Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.security import decode_access_token
from app.db.session import get_session

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
) -> dict:
    """JWT 검증 후 페이로드 반환 (username, role, user_id, branch_id, group_id, display_name)."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="유효하지 않은 인증 정보입니다.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        username: str = payload.get("sub")
        role: str = payload.get("role")
        if not username or not role:
            raise credentials_exception
        return {
            "username": username,
            "role": role,
            "user_id": payload.get("uid"),
            "branch_id": payload.get("bid"),
            "group_id": payload.get("gid"),
            "display_name": payload.get("name", username),
        }
    except JWTError:
        raise credentials_exception


def require_role(*allowed_roles: str):
    """특정 역할만 허용하는 의존성 팩토리."""
    async def _check(user: Annotated[dict, Depends(get_current_user)]):
        if user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="이 작업을 수행할 권한이 없습니다.",
            )
        return user
    return _check


# 편의 의존성
AdminOnly   = Depends(require_role("admin"))
ManagerAbove = Depends(require_role("admin", "general_manager", "branch_manager"))


def get_data_filter(user: dict) -> dict:
    """
    역할별 데이터 필터 반환.
    - admin: 제한 없음
    - general_manager: 담당 그룹(group_id)만
    - branch_manager / staff: 담당 지점(branch_id)만
    """
    role = user["role"]
    if role == "admin":
        return {"group_id": None, "branch_id": None}
    elif role == "general_manager":
        return {"group_id": user.get("group_id"), "branch_id": None}
    else:  # branch_manager, staff
        return {"group_id": None, "branch_id": user.get("branch_id")}
