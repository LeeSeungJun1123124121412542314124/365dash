# HA 대시보드

병원 만족도(HA) 데이터 통합 관리 대시보드. 모바일만족도 참여율·NPS·칭찬/불만 현황을 지점별로 모니터링하고, 엑셀 업로드로 데이터를 관리한다.

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | Vite 5 + React 18 + TypeScript + Tailwind CSS |
| 차트 | Recharts |
| 백엔드 | FastAPI + Python 3.12 |
| 데이터베이스 | PostgreSQL 15+ |
| 배포 | Railway (단일 서비스) |

## 로컬 개발 환경 설정

### 사전 요구사항

- Python 3.12+
- Node.js 20+
- PostgreSQL 15+ (DB명: `365dash`)

### 1. 환경 변수 설정

```bash
cp .env.example .env
# .env 파일을 열어 DATABASE_URL, JWT_SECRET 등을 채운다
```

### 2. 백엔드 실행

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload
# http://localhost:8000/docs 에서 API 확인
```

### 3. DB 마이그레이션

```bash
cd backend
alembic upgrade head
```

### 4. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

## Railway 배포

1. GitHub 리포(`main` 브랜치)에 push
2. Railway 대시보드에서 GitHub 연동 후 자동 빌드
3. PostgreSQL 플러그인 추가 → `DATABASE_URL` 자동 주입
4. `JWT_SECRET` 환경 변수를 Railway 대시보드에서 직접 설정

## 사내 서버 이전

```bash
# Railway에서 덤프
pg_dump -Fc -h <railway-host> -U <user> -d <db> -f ha_dashboard.dump

# 사내 PostgreSQL에 복원
pg_restore -h localhost -U postgres -d 365dash --no-owner --no-privileges ha_dashboard.dump
```

## 프로젝트 구조

```
365dash/
├── backend/           # FastAPI 백엔드
│   ├── app/
│   │   ├── main.py
│   │   ├── core/      # 설정·인증·의존성
│   │   ├── db/        # DB 세션·모델
│   │   ├── api/       # 라우터
│   │   ├── services/  # 비즈니스 로직
│   │   └── schemas/   # Pydantic 응답 스키마
│   ├── alembic/
│   └── requirements.txt
├── frontend/          # Vite + React 프론트엔드
│   └── src/
│       ├── pages/     # 10개 화면
│       ├── components/
│       └── api/
├── .env.example
├── railway.json
└── HA대시보드_세부기획서.md
```

## 문서

- [세부 기획서](HA대시보드_세부기획서.md) — 화면 명세·DB 스키마·API 명세 전체
