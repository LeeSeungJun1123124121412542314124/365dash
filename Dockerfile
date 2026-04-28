# ── 프론트엔드 빌드 ──────────────────────────────────
FROM node:20-slim AS frontend-build
WORKDIR /workspace
COPY frontend/package*.json frontend/
RUN npm --prefix frontend install
COPY frontend/ frontend/
RUN npm --prefix frontend run build

# ── 최종 이미지 ──────────────────────────────────────
FROM python:3.11-slim
WORKDIR /workspace

# pandas/numpy 의존성
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성 설치
COPY backend/requirements.txt backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# 백엔드 소스 복사
COPY backend/ backend/

# 프론트엔드 빌드 결과물 복사
COPY --from=frontend-build /workspace/frontend/dist frontend/dist/

ENV PORT=8000
EXPOSE 8000

# DB 마이그레이션 → 시드 → 서버 시작
CMD cd backend && alembic upgrade head && python seed.py && uvicorn app.main:app --host 0.0.0.0 --port $PORT
