# 미커밋 변경사항 커밋 전략 제안

## Context

`origin/main` 과 로컬 `main` 은 동일(HEAD: `4b7bf11`). 그러나 로컬 작업 디렉토리에 **수정 23개 / Untracked 2개 폴더**가 쌓여 있어 깃 상태와 실제 소스가 불일치. 변경은 크게 네 가지 목적(스키마 단위 변경, 기간 필터 개편, NPS 페이지 개편, 잡다한 정리)이 얽혀 있어 한 커밋에 묶으면 이력 추적이 어려움. "하나의 목적 = 하나의 커밋" 원칙(CLAUDE.md)에 맞춰 논리적 단위로 분리.

---

## 변경사항 분류

### 목적 1: NPS/칭찬/불만 집계를 월 단위로 통일 (day 컬럼 제거)
데이터 모델에서 `day` 필드를 제거하고 UPSERT 키를 `(branch, year, month)` 단위로 통일. 엑셀 포맷도 "매우만족(개수)" → "매우만족"으로 단순화, `일` 컬럼 제거, 공백 셀은 0으로 허용.

**파일:**
- `backend/app/db/models.py` — `NpsData.day` / `PraiseData.day` / `ComplaintData.day` 제거, 카테고리 한글 주석
- `backend/app/services/excel_parser.py` — `_valid_date`/`day` 파싱 제거, NPS 필드명 변경, 공백 0 처리
- `backend/app/api/upload.py` — `_upsert_nps` / `_replace_praise` / `_replace_complaint` 에서 day 제거
- `backend/seed.py` — NPS 월 1건으로 축소, `day=` 제거, G04 그룹 + S11/S12 지점 추가, L02~L05 이름 끝에 "점"
- `frontend/src/pages/UploadPage.tsx` — 업로드 샘플 컬럼 정의 변경

### 목적 2: 기간 필터를 시작/끝 연월 범위로 개편 + NPS 페이지 전면 개편
기존 `months` 정수 파라미터를 `start_year/start_month/end_year/end_month` 범위로 교체. FilterBar UI는 "시작 연월 ~ 끝 연월" 두 쌍의 셀렉트 + 역전 방지 로직. 모든 요약 API가 `months_in_range()` 사용. NPS 페이지는 스코어카드 6개(전체 3 + 필터 3), 월별 상세 테이블, 24개월 초과 시 가로 스크롤 차트/테이블로 확장. `PeriodSelector` + `기준값 토글`은 4개 페이지에서 제거, X축 `interval={0}` 일괄 적용.

**파일:**
- `backend/app/services/month_window.py` — `months_in_range()` 추가
- `backend/app/api/nps.py` — 범위 파라미터, baseline/filtered 누적 스코어카드, 3개 pct 상시 반환
- `backend/app/api/praise.py` / `complaint.py` / `participation.py` — 범위 파라미터
- `backend/app/api/dashboard.py` — `session.exec` → `session.scalar` 리팩터
- `frontend/src/api/hooks.ts` — `FilterParams` 타입
- `frontend/src/components/FilterBar.tsx` — 시작~끝 연월 UI + 역전 방지, NPS 레벨에서 "전체" 제거
- `frontend/src/lib/chartUtils.ts` — `defaultFilter` 1년/`npsDefaultFilter` 3년, `periodToMonths` 제거
- `frontend/src/pages/NpsPage.tsx` — 대폭 개편 (`NpsCard`/`ScrollableChart` 신규, 백데이터 테이블)
- `frontend/src/pages/ParticipationPage.tsx` / `PraisePage.tsx` / `ComplaintPage.tsx` — 범위 파라미터, `PeriodSelector`/기준값 토글 제거, interval=0
- `frontend/src/pages/MainDashboardPage.tsx` — `periodToMonths` 인라인화, interval=0

### 목적 3: 잡다한 정리 (주석 한국어화, 개발 서버 포트)
- `backend/app/core/config.py` — 주석 한국어화
- `frontend/src/components/ScoreCard.tsx` — 주석 한국어화
- `frontend/tsconfig.node.json` — 주석 한국어화
- `frontend/vite.config.ts` — 프록시 대상 포트 `8001` → `8003`

### Untracked
- `.bkit/` — bkit 런타임 상태 디렉토리. **커밋 금지**. `.gitignore` 에 추가.
- `docs/` — 기획/계획 문서. 커밋 권장 (별도 `docs:` 커밋).

---

## 권장 커밋 전략 — 4개 커밋 + 1개 설정

1. **chore: `.bkit/` 런타임 디렉토리 gitignore 추가**
2. **feat: NPS/칭찬/불만 집계를 월 단위로 통일 (day 컬럼 제거)**
3. **feat: 기간 필터를 시작/끝 연월 범위로 확장 + NPS 페이지 개편**
4. **chore: 주석 한국어화 + 개발 서버 포트 8003으로 변경**
5. **docs: 기획 및 계획 문서 추가**

---

## 주의

- 원격 `origin/main` 과 로컬이 이미 sync 된 상태. 커밋 후 `git push` 는 사용자 명시 승인 필요.
- CRLF 경고는 Git 자동 변환. 별도 조치 불필요.
