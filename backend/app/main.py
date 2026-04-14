import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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
    return {"status": "ok", "version": "1.0.0"}


# ──────────────────────────────────────────
# 프론트엔드 정적 파일 서빙 (빌드 후)
# Railway 운영: frontend/dist 가 존재할 때만 마운트
# ──────────────────────────────────────────
_frontend_dist = Path(__file__).parent.parent.parent / "frontend" / "dist"
if _frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(_frontend_dist), html=True), name="frontend")
