import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api import auth, branches, complaint, dashboard, nps, participation, praise, upload, users
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 시작 시 필요한 초기화 (DB 연결 확인 등)
    yield


app = FastAPI(
    title="HA 대시보드 API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS (로컬 개발 전용 — 운영에서는 동일 오리진이므로 불필요)
if settings.cors_origins_list:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# API 라우터 등록
app.include_router(auth.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(branches.router, prefix="/api")
app.include_router(participation.router, prefix="/api")
app.include_router(nps.router, prefix="/api")
app.include_router(praise.router, prefix="/api")
app.include_router(complaint.router, prefix="/api")
app.include_router(users.router, prefix="/api")


@app.get("/api/health")
async def health():
    # 1.0.1: 대분류+중분류 동시 선택 시 중분류 필터 우선 적용 버그 수정
    return {"status": "ok", "version": "1.0.1-filter-fix"}


# ──────────────────────────────────────────
# 프론트엔드 정적 파일 서빙 (빌드 후)
# Railway 운영: frontend/dist 가 존재할 때만 마운트
# SPA 라우팅 지원 — /assets 등 정적 파일 외 모든 경로는 index.html로 폴백
# ──────────────────────────────────────────
_frontend_dist = Path(__file__).parent.parent.parent / "frontend" / "dist"
if _frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=str(_frontend_dist / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        # API 경로는 위 라우터에서 매칭됨 — 여기 도달하면 404로 처리
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")
        # 실제 정적 파일 (favicon, robots.txt 등)이 있으면 그 파일을, 없으면 index.html
        candidate = _frontend_dist / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(_frontend_dist / "index.html")
