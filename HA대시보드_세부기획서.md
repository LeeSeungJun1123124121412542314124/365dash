# HA 대시보드 세부 기획서

**버전**: 1.1.0 | **작성일**: 2026-04-14 | **원본**: HA대시보드_기획.md + HA대시보드 기획 (1).pptx
**변경 이력**:
- v1.2.0 — 기술 스택 확정 (Vite+React+TS / FastAPI+Python 3.12). §A 기술 스택 섹션 추가.
- v1.1.0 — DB를 PostgreSQL 15+로 확정. §3 스키마/UPSERT, §7 호스팅·이전 전략 추가.

---

## 1. 개요 / 용어 정의 / 지점 구조

### 1.1 프로젝트 개요

병원 만족도(HA) 데이터를 통합 관리하는 대시보드 시스템. 모바일만족도 참여율·NPS·칭찬/불만 현황을 지점별로 모니터링하고, 엑셀 업로드를 통해 데이터를 관리한다.

### 1.2 용어 정의

| 용어 | 정의 |
|------|------|
| HA | Hospital Achievement (병원 만족도) |
| NPS | Net Promoter Score. 매우만족/만족/보통이하로 분류 |
| 참여율 | 참여자 수 ÷ 참여대상 × 100 (소수점 첫째자리) |
| 보통이하 | 보통 + 불만족 + 매우불만족 합산 |
| 기준값 | 필터 미적용 기본값 (전체 지점 + 전체 기간) |
| 필터값 | 사용자가 선택한 필터 조건에 해당하는 값 |
| 월 집계 기준 | **전월 26일 00:00 ~ 당월 25일 23:59** (전 화면 동일) |
| 지점군 | 병원급 / 람스+시술 / 람스 3개 대분류 |

### 1.3 지점 구조

| 대분류 | 코드 | 중분류 (지점명) | 지점 코드 |
|--------|------|----------------|----------|
| 병원급 | G1 | 서울병원 | B01 |
| 병원급 | G1 | 대전병원 | B02 |
| 병원급 | G1 | 부산병원 | B03 |
| 병원급 | G1 | 인천병원 | B04 |
| 병원급 | G1 | 대구병원 | B05 |
| 람스+시술 | G2 | 강남본점 | S01 |
| 람스+시술 | G2 | 노원점 | S02 |
| 람스+시술 | G2 | 분당점 | S03 |
| 람스+시술 | G2 | 성신여대점 | S04 |
| 람스+시술 | G2 | 수원점 | S05 |
| 람스+시술 | G2 | 신촌점 | S06 |
| 람스+시술 | G2 | 영등포점 | S07 |
| 람스+시술 | G2 | 일산점 | S08 |
| 람스+시술 | G2 | 천호점 | S09 |
| 람스 | G3 | 부천점 | L01 |
| 람스 | G3 | 안양평촌점 | L02 |
| 람스 | G3 | 천안점 | L03 |
| 람스 | G3 | 청주점 | L04 |
| 람스 | G3 | 해운대점 | L05 |

### 1.4 집계 소계 구분

| 소계 컬럼 | 대상 지점군 | 설명 |
|----------|-----------|------|
| 수술 (소계) | 병원급 (G1) | 5개 병원 합산 |
| 람스 (소계) | 람스 (G3) | 5개 람스 지점 합산 |
| 람스+시술 (소계) | 람스+시술 (G2) | 9개 람스+시술 지점 합산 |

---

## 2. 권한 모델

### 2.1 역할 정의

| 역할 | role 값 | 데이터 접근 범위 | 업로드 |
|------|---------|----------------|--------|
| 관리자 | admin | 전체 지점 | 가능 |
| 총괄담당자 | general_manager | 담당 지점군 전체 | 가능 |
| 지점담당자 | branch_manager | 자기 지점만 | 가능 |
| 일반접속자 | staff | 자기 지점만 | 불가 |

### 2.2 권한별 필터 제한

| 역할 | 대분류 필터 | 중분류 필터 |
|------|-----------|-----------|
| admin | 전체 선택 가능 | 전체 선택 가능 |
| general_manager | 담당 군만 표시 | 담당 군 내 지점만 |
| branch_manager | 자기 지점 군만 | 자기 지점만 |
| staff | 자기 지점 군만 | 자기 지점만 |

### 2.3 헤더 표시 규칙

- **접속자명**: 로그인한 사용자 이름
- **지점명**: staff/branch_manager → 소속 지점명, general_manager → 담당 군명, admin → "전체"

---

## 3. 데이터 모델 (DB 스키마)

> **DBMS**: PostgreSQL 15+ (데모: Railway/Neon/Supabase, 사내 이전: 온프레미스 PostgreSQL)
> 모든 SQL은 PostgreSQL 표준 문법으로 작성. 사내 이전은 `pg_dump -Fc` → `pg_restore` 한 번에 끝.

### 3.0 ENUM 타입 사전 정의

```sql
CREATE TYPE branch_group_category AS ENUM ('hospital', 'lams_surgery', 'lams');

CREATE TYPE user_role AS ENUM ('staff', 'branch_manager', 'general_manager', 'admin');

CREATE TYPE upload_type AS ENUM ('participation', 'nps', 'praise', 'complaint');

CREATE TYPE complaint_category AS ENUM (
  'parking',      -- 주차
  'guidance',     -- 안내/응대부족
  'waiting',      -- 대기관련
  'rudeness',     -- 불친절
  'system',       -- 시스템불만
  'privacy',      -- 개인정보
  'environment',  -- 환경불만
  'other'         -- 기타
);
```

### 3.1 branch_groups

```sql
CREATE TABLE branch_groups (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       VARCHAR(50) NOT NULL,  -- 병원급 / 람스+시술 / 람스
  category   branch_group_category NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0
);
```

### 3.2 branches

```sql
CREATE TABLE branches (
  id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code      VARCHAR(10) NOT NULL UNIQUE,  -- B01, S01, L01
  name      VARCHAR(50) NOT NULL,
  group_id  BIGINT NOT NULL REFERENCES branch_groups(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_branches_group ON branches(group_id);
```

### 3.3 users

```sql
CREATE TABLE users (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       VARCHAR(50) NOT NULL,
  email      VARCHAR(100) NOT NULL UNIQUE,
  role       user_role NOT NULL,
  branch_id  BIGINT REFERENCES branches(id),       -- staff/branch_manager
  group_id   BIGINT REFERENCES branch_groups(id),  -- general_manager
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.4 participation_data (참여율)

```sql
CREATE TABLE participation_data (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  branch_id         BIGINT NOT NULL REFERENCES branches(id),
  year              SMALLINT NOT NULL CHECK (year BETWEEN 2000 AND 2099),
  month             SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  target_count      INT NOT NULL CHECK (target_count >= 1),       -- 참여대상
  participant_count INT NOT NULL CHECK (participant_count >= 0),  -- 참여자 수
  -- rate = ROUND(participant_count::numeric / target_count * 100, 1) → 조회 시 계산
  uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by       BIGINT NOT NULL REFERENCES users(id),
  CONSTRAINT uq_participation UNIQUE (branch_id, year, month),
  CONSTRAINT chk_participant_le_target CHECK (participant_count <= target_count)
);

-- 덮어쓰기 (UPSERT)
INSERT INTO participation_data (branch_id, year, month, target_count, participant_count, uploaded_by)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (branch_id, year, month) DO UPDATE SET
  target_count      = EXCLUDED.target_count,
  participant_count = EXCLUDED.participant_count,
  uploaded_at       = NOW(),
  uploaded_by       = EXCLUDED.uploaded_by;
```

### 3.5 nps_data (NPS)

```sql
CREATE TABLE nps_data (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  branch_id         BIGINT NOT NULL REFERENCES branches(id),
  year              SMALLINT NOT NULL CHECK (year BETWEEN 2000 AND 2099),
  month             SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  day               SMALLINT NOT NULL CHECK (day BETWEEN 1 AND 31),
  very_satisfied    INT NOT NULL DEFAULT 0 CHECK (very_satisfied    >= 0),  -- 매우만족
  satisfied         INT NOT NULL DEFAULT 0 CHECK (satisfied         >= 0),  -- 만족
  normal            INT NOT NULL DEFAULT 0 CHECK (normal            >= 0),  -- 보통
  dissatisfied      INT NOT NULL DEFAULT 0 CHECK (dissatisfied      >= 0),  -- 불만족
  very_dissatisfied INT NOT NULL DEFAULT 0 CHECK (very_dissatisfied >= 0),  -- 매우불만족
  -- below_normal = normal + dissatisfied + very_dissatisfied → 조회 시 계산
  -- total        = 5개 합산                                   → 조회 시 계산
  uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by       BIGINT NOT NULL REFERENCES users(id),
  CONSTRAINT uq_nps UNIQUE (branch_id, year, month, day)
);

-- 덮어쓰기 (UPSERT)
INSERT INTO nps_data (branch_id, year, month, day,
                      very_satisfied, satisfied, normal, dissatisfied, very_dissatisfied,
                      uploaded_by)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
ON CONFLICT (branch_id, year, month, day) DO UPDATE SET
  very_satisfied    = EXCLUDED.very_satisfied,
  satisfied         = EXCLUDED.satisfied,
  normal            = EXCLUDED.normal,
  dissatisfied      = EXCLUDED.dissatisfied,
  very_dissatisfied = EXCLUDED.very_dissatisfied,
  uploaded_at       = NOW(),
  uploaded_by       = EXCLUDED.uploaded_by;
```

### 3.6 upload_batches (업로드 배치 이력)

```sql
CREATE TABLE upload_batches (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  type        upload_type NOT NULL,
  branch_id   BIGINT NOT NULL REFERENCES branches(id),
  year        SMALLINT NOT NULL,
  month       SMALLINT NOT NULL,
  row_count   INT NOT NULL DEFAULT 0,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by BIGINT NOT NULL REFERENCES users(id)
);

CREATE INDEX idx_upload_batches_lookup ON upload_batches(type, branch_id, year, month);
```

### 3.7 praise_data (칭찬)

```sql
CREATE TABLE praise_data (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  branch_id     BIGINT NOT NULL REFERENCES branches(id),
  year          SMALLINT NOT NULL CHECK (year BETWEEN 2000 AND 2099),
  month         SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  day           SMALLINT NOT NULL CHECK (day BETWEEN 1 AND 31),
  inflow_path   VARCHAR(100),          -- 유입경로
  content       TEXT NOT NULL,         -- 칭찬내용
  target_person VARCHAR(100),          -- 칭찬대상자 (수기기입)
  batch_id      BIGINT REFERENCES upload_batches(id),
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by   BIGINT NOT NULL REFERENCES users(id)
);

CREATE INDEX idx_praise_lookup ON praise_data(branch_id, year, month);

-- 덮어쓰기 (동일 branch/year/month 재업로드)
BEGIN;
  DELETE FROM praise_data WHERE branch_id = $1 AND year = $2 AND month = $3;
  -- INSERT INTO praise_data (...) VALUES (...), (...), ...;
COMMIT;
```

### 3.8 complaint_data (불만)

```sql
CREATE TABLE complaint_data (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  branch_id   BIGINT NOT NULL REFERENCES branches(id),
  year        SMALLINT NOT NULL CHECK (year BETWEEN 2000 AND 2099),
  month       SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  day         SMALLINT NOT NULL CHECK (day BETWEEN 1 AND 31),
  inflow_path VARCHAR(100),
  content     TEXT NOT NULL,
  category    complaint_category NOT NULL,
  batch_id    BIGINT REFERENCES upload_batches(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by BIGINT NOT NULL REFERENCES users(id)
);

CREATE INDEX idx_complaint_lookup ON complaint_data(branch_id, year, month);
CREATE INDEX idx_complaint_category ON complaint_data(category, year, month);

-- 덮어쓰기: praise_data와 동일 (DELETE + INSERT in single transaction)
```

### 3.9 월 집계 기준 함수 (pseudo-code)

```
month_window(year Y, month M):
  start = (M == 1) ? datetime(Y-1, 12, 26, 0, 0, 0)
                   : datetime(Y,   M-1, 26, 0, 0, 0)
  end   = datetime(Y, M, 25, 23, 59, 59)
  return (start, end)
```

---

## 4. 엑셀 업로드 명세

### 4.0 공통 규칙

- 파일 형식: `.xlsx` / `.xls`
- 첫 행: 헤더 (컬럼명 정확히 일치 필수)
- 빈 행: 무시
- 오류 발생 시: 전체 롤백 (부분 저장 없음)
- 오류 보고: 오류 행 번호 + 컬럼명 + 입력값 + 메시지 목록

### 4.1 참여율 업로드

| 컬럼명 | 타입 | 필수 | 검증 규칙 | 에러 메시지 |
|--------|------|:----:|----------|------------|
| 연도 | 숫자 | ✅ | 2000~2099 정수 | "연도는 4자리 숫자여야 합니다" |
| 월 | 숫자 | ✅ | 1~12 정수 | "월은 1~12 사이 숫자여야 합니다" |
| 지점명 | 문자 | ✅ | branches.name 존재 | "존재하지 않는 지점명: {값}" |
| 참여대상 | 숫자 | ✅ | 양의 정수 (≥1) | "참여대상은 1 이상이어야 합니다" |
| 참여자 수 | 숫자 | ✅ | 0 이상, ≤ 참여대상 | "참여자 수가 참여대상을 초과합니다" |
| 참여율 | 숫자 | ❌ | 무시 (서버에서 계산) | — |

**계산**: `rate = ROUND(참여자수 / 참여대상 × 100, 1)`
**중복**: UPSERT on (branch_id, year, month)

### 4.2 NPS 업로드

| 컬럼명 | 타입 | 필수 | 검증 규칙 | 에러 메시지 |
|--------|------|:----:|----------|------------|
| 연도 | 숫자 | ✅ | 2000~2099 | 위와 동일 |
| 월 | 숫자 | ✅ | 1~12 | 위와 동일 |
| 일 | 숫자 | ✅ | 1~31, 해당 월 유효 날짜 | "유효하지 않은 날짜입니다" |
| 지점명 | 문자 | ✅ | branches.name 존재 | 위와 동일 |
| 매우만족(개수) | 숫자 | ✅ | 0 이상 정수 | "음수값은 허용되지 않습니다" |
| 만족(개수) | 숫자 | ✅ | 0 이상 정수 | 위와 동일 |
| 보통(개수) | 숫자 | ✅ | 0 이상 정수 | 위와 동일 |
| 불만족(개수) | 숫자 | ✅ | 0 이상 정수 | 위와 동일 |
| 매우불만족(개수) | 숫자 | ✅ | 0 이상 정수 | 위와 동일 |
| 보통이하 | 숫자 | ❌ | 무시 (서버 계산) | — |
| 총개수 | 숫자 | ❌ | 무시 (서버 계산) | — |

**중복**: UPSERT on (branch_id, year, month, day)

### 4.3 칭찬 업로드

| 컬럼명 | 타입 | 필수 | 검증 규칙 | 에러 메시지 |
|--------|------|:----:|----------|------------|
| No. | 숫자 | ❌ | 무시 | — |
| 유입경로 | 문자 | ❌ | 최대 100자 | — |
| 지점명 | 문자 | ✅ | branches.name 존재 | 위와 동일 |
| 연도 | 숫자 | ✅ | 2000~2099 | 위와 동일 |
| 월 | 숫자 | ✅ | 1~12 | 위와 동일 |
| 일 | 숫자 | ✅ | 유효 날짜 | 위와 동일 |
| 칭찬내용 | 문자 | ✅ | 1자 이상 | "칭찬내용은 필수입니다" |
| 칭찬대상자 | 문자 | ❌ | 최대 100자 | — |

**중복**: 동일 (branch_id, year, month) 재업로드 시 DELETE + INSERT

### 4.4 불만 업로드

| 컬럼명 | 타입 | 필수 | 검증 규칙 | 에러 메시지 |
|--------|------|:----:|----------|------------|
| No. | 숫자 | ❌ | 무시 | — |
| 연도 | 숫자 | ✅ | 2000~2099 | — |
| 월 | 숫자 | ✅ | 1~12 | — |
| 일 | 숫자 | ✅ | 유효 날짜 | — |
| 지점명 | 문자 | ✅ | branches.name 존재 | — |
| 유입경로 | 문자 | ❌ | 최대 100자 | — |
| 불만내용 | 문자 | ✅ | 1자 이상 | "불만내용은 필수입니다" |
| 불만카테고리선택 | 문자 | ✅ | 아래 8개 값 중 하나 | "유효하지 않은 카테고리: {값}" |

**불만카테고리 enum 매핑**

| 엑셀 입력값 | DB category | 탭2 컬럼명 |
|------------|-------------|-----------|
| 주차 | parking | 주차 |
| 안내 응대부족 | guidance | 안내 응대부족 |
| 대기관련 | waiting | 대기관련 |
| 불친절 | rudeness | 불친절 |
| 시스템불만 | system | 시스템불만 |
| 개인정보 | privacy | 개인정보 |
| 환경불만 | environment | 환경불만 |
| 기타 | other | 기타 |

**중복**: 칭찬과 동일. 동일 (branch_id, year, month) DELETE + INSERT

---

## 5. API 명세

### 5.0 공통

- **Base URL**: `/api/v1`
- **인증**: `Authorization: Bearer {JWT}` 필수 (전 엔드포인트)
- **권한 가드**: 응답 데이터는 로그인 사용자 권한 범위로 자동 필터링
- **에러 형식**:
  ```json
  { "error": "UNAUTHORIZED", "message": "로그인이 필요합니다" }
  ```

**공통 쿼리 파라미터** (조회 API):

| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| year | integer | 현재 연도 | 조회 연도 |
| month | integer | 현재 월 | 조회 월 (0 = 전체) |
| group_id | integer | null | 대분류 ID (null = 전체 합산) |
| branch_id | integer | null | 중분류 ID (null = 전체) |

---

### 5.1 GET /dashboard/main

메인대시보드 — 최근 6개월 집계 (권한 범위 내 전 지점).

```json
{
  "scorecard": {
    "participation_rate_avg": 51.1,
    "nps_very_satisfied_pct": 80.9,
    "nps_satisfied_pct": 15.0,
    "nps_below_normal_pct": 4.1,
    "praise_count_avg": 415,
    "complaint_count_avg": 25
  },
  "charts": {
    "participation_trend": [
      { "label": "2025-11", "rate": 49.1 }
    ],
    "nps_trend": [
      { "label": "2025-11", "very_satisfied_pct": 82.5, "satisfied_pct": 13.9, "below_normal_pct": 3.6 }
    ],
    "praise_trend": [
      { "label": "2025-11", "count": 473 }
    ],
    "complaint_trend": [
      { "label": "2025-11", "count": 34 }
    ]
  }
}
```

> 데이터 6개월 미만: 있는 월만 포함. 빈 월 없음.

---

### 5.2 GET /participation

```json
{
  "scorecard": { "current_month_rate": 50.8 },
  "chart": {
    "series": [
      { "label": "기준값 (전체)", "type": "line",
        "data": [{ "x": "2026-01", "y": 51.7 }] },
      { "label": "필터값 (선택 지점/군)", "type": "line",
        "data": [{ "x": "2026-01", "y": 48.2 }] }
    ]
  }
}
```

> 필터 미선택 시 series 1개(기준값)만 반환.

---

### 5.3 GET /nps

**추가 파라미터**: `nps_level` (all | very_satisfied | satisfied | below_normal)

```json
{
  "scorecard": {
    "very_satisfied": { "count": 1250, "pct": 80.9 },
    "satisfied":      { "count": 232,  "pct": 15.0 },
    "below_normal":   { "count": 63,   "pct": 4.1  }
  },
  "chart": {
    "series": [
      { "label": "기준값", "type": "line",
        "data": [{ "x": "2026-03", "very_satisfied_pct": 80.9, "satisfied_pct": 15.0, "below_normal_pct": 4.1 }] },
      { "label": "필터값", "type": "line", "data": [...] }
    ]
  }
}
```

---

### 5.4 GET /praise

```json
{
  "scorecard": {
    "baseline_total": 1244,
    "filtered_total": 413
  },
  "chart": {
    "series": [
      { "label": "기준값", "type": "bar",
        "data": [{ "x": "2026-01", "total": 403, "surgery": 218, "lams": 41, "lams_surgery": 144 }] },
      { "label": "필터값", "type": "bar", "data": [...] }
    ]
  }
}
```

---

### 5.5 GET /complaint

praise와 동일 구조. `surgery` → `surgery_complaint`, `lams` → `lams_complaint`, `lams_surgery` → `lams_surgery_complaint`.

---

### 5.6 GET /complaint/keywords

```json
{
  "rows": [
    {
      "year": 2026, "month": 3,
      "group_name": "병원급", "branch_name": "서울병원",
      "parking": 2, "guidance": 5, "waiting": 3,
      "rudeness": 1, "system": 0, "privacy": 0,
      "environment": 1, "other": 3, "total": 15
    }
  ]
}
```

---

### 5.7 POST /upload/participation
### 5.8 POST /upload/nps
### 5.9 POST /upload/praise
### 5.10 POST /upload/complaint

**공통 Request**: `Content-Type: multipart/form-data`, `file` 필드에 xlsx 첨부.

**성공 Response**:
```json
{ "success": true, "uploaded_count": 19, "errors": [] }
```

**실패 Response** (전체 롤백):
```json
{
  "success": false, "uploaded_count": 0,
  "errors": [
    { "row": 3, "column": "지점명", "value": "없는지점", "message": "존재하지 않는 지점명: 없는지점" }
  ]
}
```

---

## 6. 화면 명세

> **공통 헤더 구성**: 좌측 접속자명, 중앙 지점명, 우측 로그아웃 버튼
> **공통 GNB 메뉴**: 모바일만족도 참여율 | NPS | 칭찬/불만 현황 | VOC 업로드 | 게시판 | 기타자료현황

---

### 6.1 메인대시보드

**URL**: `/dashboard`

#### 스코어카드 (4개)

| 카드 | 계산식 | 표시 형식 |
|------|--------|----------|
| 참여율 | 최근 6개월 월별 rate 평균 | n.n% |
| NPS 매우만족 | 6개월 합산 very_satisfied / 합산 total × 100 | n.n% |
| NPS 만족 | 6개월 합산 satisfied / 합산 total × 100 | n.n% |
| NPS 보통이하 | 6개월 합산 below_normal / 합산 total × 100 | n.n% |
| 칭찬현황 | 최근 6개월 월별 count 평균 | n건 |
| 불만현황 | 최근 6개월 월별 count 평균 | n건 |

#### 그래프 (4개)

| 그래프 | 종류 | X축 | Y축 | 데이터 |
|--------|------|-----|-----|--------|
| 모바일만족도 참여율 추이 | 꺾은선 | 월 (최근 6개월) | 참여율 (%) | 전체 평균 |
| 전지점 NPS 추이 | 꺾은선 | 월 (최근 6개월) | 매우만족 (%) | 전체 평균 |
| 칭찬 개수 추이 | 막대 | 월 (최근 6개월) | 건수 | 전체 합계 |
| 불만 개수 추이 | 막대 | 월 (최근 6개월) | 건수 | 전체 합계 |

#### 빈 상태 / 에러

| 상황 | 표시 |
|------|------|
| 업로드 데이터 없음 | "데이터가 없습니다. 업로드 게시판에서 데이터를 업로드해 주세요." |
| API 오류 | "데이터를 불러오는 데 실패했습니다. 잠시 후 다시 시도해 주세요." |

---

### 6.2 모바일만족도 참여율

**URL**: `/participation`

#### 필터

| 필터 | 기본값 | 비고 |
|------|--------|------|
| 기간선택 (연도, 월) | 전체 | 연도 선택 → 월 드롭다운 활성화 |
| 대분류 | 전체선택 | 병원급/람스+시술/람스 |
| 중분류 | 전체선택 | 대분류 선택 후 해당 군 지점 표시 |

> 대분류/중분류 전체선택 = 전체 합산. 중분류는 대분류 선택 이후 선택 가능(선택사항).

#### 스코어카드

- **이번달 참여율**: 현재 연도/월 + 선택된 필터의 참여율 (n.n%)
- 월 미선택 시 현재 달 자동 적용

#### 그래프

| 속성 | 값 |
|------|-----|
| 종류 | 꺾은선 (Line Chart) |
| X축 | 연도-월 레이블 (예: 2026-01) |
| Y축 | 참여율 (%), 범위 0~100 |
| 기준값 시리즈 | 회색 실선, 범례 "전체" |
| 필터값 시리즈 | 파란색 실선, 범례 선택한 군/지점명 |
| 필터 미선택 시 | 시리즈 1개 (기준값만) |

#### 빈 상태 / 에러

| 상황 | 표시 |
|------|------|
| 선택 기간 데이터 없음 | 그래프 영역 "해당 기간 데이터가 없습니다" |
| 스코어카드 데이터 없음 | "—" 표시 |

---

### 6.3 NPS

**URL**: `/nps`

#### 필터

| 필터 | 기본값 | 비고 |
|------|--------|------|
| 기간선택 (연도, 월) | 전체 | |
| 대분류 | 전체선택 | |
| 중분류 | 전체선택 | |
| NPS선택 | 전체선택 | 매우만족/만족/보통이하 (복수 선택 가능) |
| 기준값 필터 | 별도 필터행 | 기간/대분류(전체)/중분류(전체)/NPS선택 |

#### 기준값 숨기기 버튼

- 클릭 시: 기준값 시리즈 숨김, 스코어카드 기준값 영역 숨김
- 재클릭 시: 복원

#### 스코어카드 (필터값 기준)

| 항목 | 계산식 | 표시 |
|------|--------|------|
| 매우만족 | 합산 very_satisfied | n건 / n.n% |
| 만족 | 합산 satisfied | n건 / n.n% |
| 보통이하 | 합산 below_normal | n건 / n.n% |

#### 그래프

| 속성 | 꺾은선 (기본) | 막대 (그래프변경 후) |
|------|-------------|-------------------|
| X축 | 월별 | 지점/군별 |
| Y축 | NPS 비율 (%) | NPS 비율 (%) |
| 기준값 | 회색 선 | 회색 막대 클러스터 |
| 필터값 | 색상 선 | 색상 막대 클러스터 |
| NPS선택=전체 | 3개 선 (매우만족/만족/보통이하) | 3개 막대 그룹 |

> **그래프 변경 버튼**: 꺾은선(시계열) ↔ 막대(지점 비교) 토글

---

### 6.4 칭찬현황

**URL**: `/praise`

#### 필터

기간선택 / 대분류 / 중분류 (NPS와 동일 구조)  
기준값 필터 행 별도 표시. 기준값 숨기기 버튼 포함.

#### 스코어카드

| 항목 | 값 |
|------|-----|
| 기준값 칭찬 총계 | 기준값 필터 기간의 전체 칭찬 합산 |
| 필터값 칭찬 총계 | 선택한 필터의 칭찬 합산 |

#### 그래프

| 속성 | 값 |
|------|-----|
| 종류 | 막대 클러스터 (Bar Chart) |
| X축 | 월별 (기간 필터) 또는 지점별 (지점 필터 선택 시) |
| Y축 | 칭찬 개수 (건) |
| 기준값 막대 | 회색 |
| 필터값 막대 | 파란색 (나란히) |

---

### 6.5 불만현황 — 탭 1 (그래프)

**URL**: `/complaint` (기본 탭)

6.4 칭찬현황과 동일한 레이아웃/필터/그래프 구조.  
Y축 레이블: "불만 개수 (건)", 스코어카드: "기준값 불만 총계 / 필터값 불만 총계"

---

### 6.6 불만현황 — 탭 2 (키워드)

**URL**: `/complaint?tab=keywords`

#### 필터

기간선택 / 대분류 / 중분류 필터 (행 상단). 기준값 숨기기 버튼.

#### 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| 연도 | 숫자 | 집계 연도 |
| 월 | 숫자 | 집계 월 |
| 대분류 | 문자 | 지점군명 |
| 중분류 | 문자 | 지점명 |
| 주차 | 숫자 | 카테고리별 건수 |
| 안내 응대부족 | 숫자 | |
| 대기관련 | 숫자 | |
| 불친절 | 숫자 | |
| 시스템불만 | 숫자 | |
| 개인정보 | 숫자 | |
| 환경불만 | 숫자 | |
| 기타 | 숫자 | |
| 총개수 | 숫자 | 8개 카테고리 합산 |

---

### 6.7 업로드 게시판 — 참여율 업로드

**URL**: `/upload/participation`

#### UX 흐름

1. [엑셀 파일 업로드 버튼] 클릭 → 파일 선택 다이얼로그
2. 파일 선택 → 클라이언트에서 미리보기 파싱 (참여율 자동 계산 포함)
3. 미리보기 테이블 표시 (검증 오류 행 빨간 배경 강조)
4. [저장 및 업로드 버튼] 클릭 → `POST /api/v1/upload/participation`
5. 성공: "n건 업로드 완료" 토스트 메시지
6. 실패: 오류 목록 (행/컬럼/메시지) 표시, 저장 안 됨

#### 미리보기 테이블 컬럼

연도 | 월 | 지점명 | 참여대상 | 참여자 수 | 참여율(자동계산)

---

### 6.8 업로드 게시판 — NPS 업로드

**URL**: `/upload/nps`

6.7과 동일한 UX 흐름. 미리보기 테이블에 보통이하(자동계산) / 총개수(자동계산) 컬럼 포함.

---

### 6.9 업로드 게시판 — 칭찬 업로드

**URL**: `/upload/praise`

6.7과 동일. 미리보기 테이블: No.(자동채번) | 유입경로 | 지점명 | 연도 | 월 | 일 | 칭찬내용 | 칭찬대상자

---

### 6.10 업로드 게시판 — 불만 업로드

**URL**: `/upload/complaint`

6.7과 동일. 불만카테고리선택 컬럼 값이 8개 enum 외 값이면 즉시 강조.  
미리보기 테이블: No. | 연도 | 월 | 일 | 지점명 | 유입경로 | 불만내용 | 불만카테고리선택

---

## A. 기술 스택

### A.1 프론트엔드 (`frontend/`)

| 항목 | 선택 | 비고 |
|------|------|------|
| 빌드 도구 | Vite 5 | 로컬 HMR < 1초 |
| 프레임워크 | React 18 + TypeScript | |
| 스타일 | Tailwind CSS 3 | 다수 화면 빠른 레이아웃 |
| 차트 | Recharts | 꺾은선(참여율/NPS) + 막대 클러스터(칭찬/불만) |
| 테이블 | TanStack Table v8 | 불만 키워드 탭2 — 8컬럼 정렬/필터 |
| 엑셀 미리보기 | SheetJS (xlsx) | 업로드 전 클라이언트 컬럼 검증 |
| HTTP / 캐싱 | axios + TanStack Query v5 | 서버 상태 캐싱·리페치 |
| 라우팅 | React Router v6 | 10개 화면 |
| 전역 상태 | Zustand | 공통 필터(기간/지점군/지점) 컨텍스트 |

### A.2 백엔드 (`backend/`)

| 항목 | 선택 | 비고 |
|------|------|------|
| 프레임워크 | FastAPI | OpenAPI(/docs) 자동 생성 |
| 런타임 | Python 3.12 | |
| DB | PostgreSQL 15+ | Railway 플러그인 / 사내 서버 |
| DB 드라이버 | asyncpg + SQLModel | 비동기 쿼리 |
| 마이그레이션 | Alembic | 스키마 변경 이력 추적 |
| 엑셀 파싱 | pandas + openpyxl | 4종 업로드 양식 |
| 인증 | python-jose (JWT) + passlib[bcrypt] | §2 권한 모델 |
| 설정 | pydantic-settings | `.env` 로드 |
| 서버 | uvicorn[standard] | |
| 패키지 관리 | pip + requirements.txt | |

### A.3 배포 구조 (단일 Railway 서비스)

```
Railway 서비스 1개 + PostgreSQL 플러그인 1개
└─ FastAPI (uvicorn)
   ├─ /api/*      → API 라우터
   ├─ /docs       → OpenAPI UI
   └─ /*          → StaticFiles(frontend/dist) — React SPA
```

- **빌드 순서**: `npm --prefix frontend ci` → `npm --prefix frontend run build` → `pip install -r backend/requirements.txt`
- **시작 명령**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --app-dir backend`
- **로컬 개발**: frontend(`npm run dev`, port 5173) + backend(`uvicorn`, port 8000) 분리 실행. CORS `localhost:5173` 허용.
- **사내 이전**: `pg_dump -Fc` → `pg_restore` (§7.1 절차 준용)

### A.4 Git / CI

- GitHub 리포: `https://github.com/LeeSeungJun1123124121412542314124/365dash`
- Railway: GitHub 연동, `main` 브랜치 push 시 자동 배포

---

## 7. 비기능 요구사항

| 항목 | 요구사항 |
|------|---------|
| 브라우저 지원 | Chrome 최신 2버전, Edge 최신 2버전, Safari 15+ |
| 반응형 | 1024px 이상 데스크탑 우선 (모바일 대응 별도 확인 필요) |
| 페이지 로드 | 대시보드 초기 로드 ≤ 3초 (LCP 기준) |
| API 응답 | 조회 API ≤ 500ms (p95) |
| 업로드 파일 | 최대 10MB / 최대 5,000행 |
| 세션 | JWT 만료 8시간 |
| 데이터 보존 | 업로드 이력 무기한 보존 (upload_batches) |

### 7.1 호스팅 / 이전 전략

| 단계 | 프론트 | 백엔드 | DB |
|------|--------|--------|-----|
| **데모** | Netlify 또는 Railway | Railway (Node/Python 컨테이너) | Railway PostgreSQL (또는 Neon/Supabase) |
| **사내 이전** | 사내 Nginx/IIS | 사내 Node/Python 서버 | 사내 PostgreSQL 15+ |

**환경 분리 원칙**:
- 모든 환경 설정은 환경변수(`DATABASE_URL`, `JWT_SECRET`, `UPLOAD_MAX_MB` 등)로 주입
- 코드/스키마 변경 없이 환경변수만 교체로 이전 가능
- `.env.example` 파일을 리포지토리에 포함 (실제 값 제외)

**DB 이전 절차** (클라우드 → 사내):

```bash
# 1. 클라우드(Railway 등)에서 덤프
pg_dump -Fc -h <cloud-host> -U <user> -d <db> -f ha_dashboard.dump

# 2. 사내 PostgreSQL에 빈 DB 생성
createdb -h localhost -U postgres ha_dashboard

# 3. 복원
pg_restore -h localhost -U postgres -d ha_dashboard --no-owner --no-privileges ha_dashboard.dump

# 4. 애플리케이션 환경변수만 변경
# DATABASE_URL=postgres://user:pass@internal-db.local:5432/ha_dashboard
```

**검증 체크리스트**:
- [ ] ENUM 타입 4종 정상 이전 (`\dT+` 로 확인)
- [ ] IDENTITY 시퀀스 값 이어쓰기 가능 여부 확인
- [ ] CHECK 제약 / UNIQUE 제약 모두 보존
- [ ] upload_batches 이력 누락 없음
- [ ] 인덱스 4종 재생성 확인 (`\di`)

---

## 8. 미해결 이슈 / 가정사항

| # | 항목 | 현재 가정 | 확인 필요 |
|---|------|----------|---------|
| 1 | 메인대시보드 "전지점 모바일만족도 그래프"가 참여율 추이와 별도 NPS 추이인지 | NPS 추이 꺾은선으로 가정 | ✅ |
| 2 | 칭찬/불만 그래프 X축이 시계열인지 지점 비교인지 | 필터 상태에 따라 전환 | ✅ |
| 3 | 칭찬/불만 수술/람스/람스+시술 소계를 스택 막대로 표시할지 토탈만 표시할지 | 토탈 1개 시리즈로 가정 | ✅ |
| 4 | VOC 업로드 / 게시판 / 기타자료현황 메뉴 기능 범위 | 이번 기획서 범위 외 | ✅ 별도 기획 필요 |
| 5 | 참여율 목표 기준선(예: 60%) 그래프 표시 여부 | 없음으로 가정 | 확인 필요 |
| 6 | NPS 그래프 변경 버튼의 전환 대상 | 꺾은선 ↔ 막대 토글 | ✅ |
| 7 | 모바일 반응형 지원 여부 | 데스크탑 우선 | 확인 필요 |
| 8 | 일반접속자(staff)의 업로드 권한 | 불가로 가정 | ✅ 확인 필요 |
| 9 | NPS 기준값 필터의 독립 기간 설정 범위 | 별도 기간 선택 가능으로 가정 | ✅ |
| 10 | 칭찬/불만 업로드 시 동일 배치 내 지점 혼재 허용 여부 | 여러 지점 한 파일에 허용으로 가정 | 확인 필요 |
