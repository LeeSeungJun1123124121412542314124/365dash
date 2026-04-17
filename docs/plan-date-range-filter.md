# 기간 범위 필터 확장 + 차트 버튼 삭제

## Context
현재 참여율/NPS/칭찬현황/불만현황 4개 페이지의 기간 필터가 단일 연도+월 선택 방식이고, 차트에 "기준값 숨기기", "3개월", "6개월" 버튼이 있음. 사용자 요청:
1. 기간 설정을 "2019년 12월 ~ 2020년 12월" 형태의 시작~끝 범위로 확장
2. "기준값 숨기기", "3개월", "6개월" 버튼 삭제

기간 범위로 변경하면 months 파라미터(3m/6m)가 불필요해지므로 자연스럽게 삭제됨.

---

## 1. 프론트엔드 — FilterValue 인터페이스 변경

**파일**: `frontend/src/components/FilterBar.tsx`

```ts
// Before
export interface FilterValue {
  groupId: number | null;
  branchId: number | null;
  year: number;
  month: number;
}

// After
export interface FilterValue {
  groupId: number | null;
  branchId: number | null;
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
}
```

## 2. 프론트엔드 — FilterBar UI 변경

기간 셀렉터를 "시작 연도/월 ~ 끝 연도/월" 4개 드롭다운으로 변경:
```
기간 [2019년 v] [12월 v] ~ [2020년 v] [12월 v]
```

## 3. 프론트엔드 — chartUtils.ts 변경

- `defaultFilter()`: `startYear/startMonth/endYear/endMonth` 반환 (기본값: 끝=현재월, 시작=6개월 전)
- `periodToMonths()` 함수 삭제

## 4. 프론트엔드 — 4개 페이지 수정

각 페이지에서:
- `PERIOD_OPTIONS`, `period` state, `showBaseline` state 삭제
- `PeriodSelector` import 및 사용 삭제
- "기준값 숨기기" 버튼 삭제
- 차트에서 기준값 항상 렌더링
- API 호출: `start_year`, `start_month`, `end_year`, `end_month` 전달

## 5. 프론트엔드 — hooks.ts 변경

```ts
interface FilterParams {
  start_year?: number;
  start_month?: number;
  end_year?: number;
  end_month?: number;
  group_id?: number | null;
  branch_id?: number | null;
}
```

## 6. 백엔드 — month_window.py에 범위 함수 추가

`months_in_range(start_year, start_month, end_year, end_month)` 함수 추가

## 7. 백엔드 — 4개 API 수정

- `months` 파라미터 → `start_year`, `start_month`, `end_year`, `end_month`로 변경
- `recent_months()` → `months_in_range()` 호출
- participation: 기존 `year`/`month` 단일 파라미터 제거

## 8. PeriodSelector 컴포넌트

MainDashboardPage에서 사용 중이므로 파일 유지. 4개 페이지에서 import만 제거.
