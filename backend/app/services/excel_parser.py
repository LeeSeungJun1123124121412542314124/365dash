"""
엑셀 업로드 파서 — §4 업로드 명세 기반.
4종 양식(participation / nps / praise / complaint) 각각 parse_* 함수 제공.
반환: (records: list[dict], errors: list[dict])
오류 발생 시 전체 롤백 — 빈 records 반환.
"""
from io import BytesIO
from typing import Any

import pandas as pd


# ──────────────────────────────────────────
# 공통 유틸
# ──────────────────────────────────────────

MAX_ROWS = 5_000
MAX_BYTES = 10 * 1024 * 1024  # 10 MB


def _row_error(row_num: int, column: str, value: Any, message: str) -> dict:
    return {"row": row_num, "column": column, "value": value, "message": message}


def _check_required(df: pd.DataFrame, required_cols: list[str]) -> list[dict]:
    errors = []
    for col in required_cols:
        if col not in df.columns:
            errors.append({"row": 0, "column": col, "value": None,
                           "message": f"필수 컬럼 '{col}'이 없습니다."})
    return errors


def _safe_int(val: Any, default: int = 0) -> int | None:
    if pd.isna(val):
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        return None


# ──────────────────────────────────────────
# §4.1 참여율 업로드
# ──────────────────────────────────────────

PARTICIPATION_REQUIRED = ["연도", "월", "지점명", "참여대상", "참여자 수"]


def parse_participation(file_bytes: bytes) -> tuple[list[dict], list[dict]]:
    df = pd.read_excel(BytesIO(file_bytes), dtype=str)
    # 빈 행 제거
    df = df.dropna(how="all").reset_index(drop=True)

    errors = _check_required(df, PARTICIPATION_REQUIRED)
    if errors:
        return [], errors

    if len(df) > MAX_ROWS:
        return [], [{"row": 0, "column": "-", "value": len(df),
                     "message": f"최대 {MAX_ROWS:,}행까지 업로드 가능합니다."}]

    records, row_errors = [], []
    for idx, row in df.iterrows():
        rn = idx + 2

        year_raw = row.get("연도")
        month_raw = row.get("월")
        target_raw = row.get("참여대상")
        participant_raw = row.get("참여자 수")
        branch_name = str(row.get("지점명", "")).strip()

        year = _safe_int(year_raw)
        month = _safe_int(month_raw)
        target = _safe_int(target_raw)
        participant = _safe_int(participant_raw)

        if year is None or not (2000 <= year <= 2099):
            row_errors.append(_row_error(rn, "연도", year_raw, "연도는 4자리 숫자여야 합니다"))
        if month is None or not (1 <= month <= 12):
            row_errors.append(_row_error(rn, "월", month_raw, "월은 1~12 사이 숫자여야 합니다"))
        if not branch_name:
            row_errors.append(_row_error(rn, "지점명", None, "지점명은 필수입니다"))
        if target is None or target < 1:
            row_errors.append(_row_error(rn, "참여대상", target_raw, "참여대상은 1 이상이어야 합니다"))
        if participant is None or participant < 0:
            row_errors.append(_row_error(rn, "참여자 수", participant_raw, "0 이상의 정수여야 합니다"))
        if target and participant and participant > target:
            row_errors.append(_row_error(rn, "참여자 수", participant_raw, "참여자 수가 참여대상을 초과합니다"))

        if not any(e["row"] == rn for e in row_errors):
            records.append({
                "year": year,
                "month": month,
                "branch_name": branch_name,
                "target_count": target,
                "participant_count": participant,
            })

    if row_errors:
        return [], row_errors
    return records, []


# ──────────────────────────────────────────
# §4.2 NPS 업로드
# ──────────────────────────────────────────

NPS_REQUIRED = ["연도", "월", "지점명",
                "매우만족", "만족", "보통", "불만족", "매우불만족"]


def parse_nps(file_bytes: bytes) -> tuple[list[dict], list[dict]]:
    df = pd.read_excel(BytesIO(file_bytes), dtype=str)
    df = df.dropna(how="all").reset_index(drop=True)

    errors = _check_required(df, NPS_REQUIRED)
    if errors:
        return [], errors

    if len(df) > MAX_ROWS:
        return [], [{"row": 0, "column": "-", "value": len(df),
                     "message": f"최대 {MAX_ROWS:,}행까지 업로드 가능합니다."}]

    records, row_errors = [], []
    for idx, row in df.iterrows():
        rn = idx + 2

        year = _safe_int(row.get("연도"))
        month = _safe_int(row.get("월"))
        branch_name = str(row.get("지점명", "")).strip()

        if year is None or not (2000 <= year <= 2099):
            row_errors.append(_row_error(rn, "연도", row.get("연도"), "연도는 4자리 숫자여야 합니다"))
        if month is None or not (1 <= month <= 12):
            row_errors.append(_row_error(rn, "월", row.get("월"), "월은 1~12 사이 숫자여야 합니다"))
        if not branch_name:
            row_errors.append(_row_error(rn, "지점명", None, "지점명은 필수입니다"))

        count_fields = {
            "매우만족": "very_satisfied",
            "만족": "satisfied",
            "보통": "normal",
            "불만족": "dissatisfied",
            "매우불만족": "very_dissatisfied",
        }
        counts = {}
        for kr, en in count_fields.items():
            val = _safe_int(row.get(kr))
            if val is None:
                val = 0  # 공백 셀은 0 처리
            if val < 0:
                row_errors.append(_row_error(rn, kr, row.get(kr), "음수값은 허용되지 않습니다"))
            else:
                counts[en] = val

        if not any(e["row"] == rn for e in row_errors):
            records.append({
                "year": year,
                "month": month,
                "branch_name": branch_name,
                **counts,
            })

    if row_errors:
        return [], row_errors
    return records, []


# ──────────────────────────────────────────
# §4.3 칭찬 업로드 — 월 단위 집계 (연도/월/지점명/칭찬개수)
# ──────────────────────────────────────────

PRAISE_REQUIRED = ["연도", "월", "지점명", "칭찬개수"]


def parse_praise(file_bytes: bytes) -> tuple[list[dict], list[dict]]:
    df = pd.read_excel(BytesIO(file_bytes), dtype=str)
    df = df.dropna(how="all").reset_index(drop=True)

    errors = _check_required(df, PRAISE_REQUIRED)
    if errors:
        return [], errors

    if len(df) > MAX_ROWS:
        return [], [{"row": 0, "column": "-", "value": len(df),
                     "message": f"최대 {MAX_ROWS:,}행까지 업로드 가능합니다."}]

    records, row_errors = [], []
    for idx, row in df.iterrows():
        rn = idx + 2

        year = _safe_int(row.get("연도"))
        month = _safe_int(row.get("월"))
        branch_name = str(row.get("지점명", "")).strip()
        count = _safe_int(row.get("칭찬개수"))
        if count is None:
            count = 0  # 공백 셀은 0 처리

        if year is None or not (2000 <= year <= 2099):
            row_errors.append(_row_error(rn, "연도", row.get("연도"), "연도는 4자리 숫자여야 합니다"))
        if month is None or not (1 <= month <= 12):
            row_errors.append(_row_error(rn, "월", row.get("월"), "월은 1~12 사이 숫자여야 합니다"))
        if not branch_name:
            row_errors.append(_row_error(rn, "지점명", None, "지점명은 필수입니다"))
        if count < 0:
            row_errors.append(_row_error(rn, "칭찬개수", row.get("칭찬개수"), "0 이상의 정수여야 합니다"))

        if not any(e["row"] == rn for e in row_errors):
            records.append({
                "year": year,
                "month": month,
                "branch_name": branch_name,
                "count": count,
            })

    if row_errors:
        return [], row_errors
    return records, []


# ──────────────────────────────────────────
# §4.4 불만 업로드 — 키워드+개수 집계 (연도/월/지점명/불만키워드/개수)
# ──────────────────────────────────────────

COMPLAINT_REQUIRED = ["연도", "월", "대분류", "불만키워드", "개수"]

VALID_GROUPS = ["병원급", "람스+시술", "람스", "기타"]


def parse_complaint(file_bytes: bytes) -> tuple[list[dict], list[dict]]:
    df = pd.read_excel(BytesIO(file_bytes), dtype=str)
    df = df.dropna(how="all").reset_index(drop=True)

    errors = _check_required(df, COMPLAINT_REQUIRED)
    if errors:
        return [], errors

    if len(df) > MAX_ROWS:
        return [], [{"row": 0, "column": "-", "value": len(df),
                     "message": f"최대 {MAX_ROWS:,}행까지 업로드 가능합니다."}]

    records, row_errors = [], []
    for idx, row in df.iterrows():
        rn = idx + 2

        year = _safe_int(row.get("연도"))
        month = _safe_int(row.get("월"))
        group_name = str(row.get("대분류", "")).strip()
        keyword_raw = row.get("불만키워드")
        keyword = str(keyword_raw).strip()[:100] if not pd.isna(keyword_raw) and str(keyword_raw).strip() else ""
        count = _safe_int(row.get("개수"))
        if count is None:
            count = 0  # 공백 셀은 0 처리

        if year is None or not (2000 <= year <= 2099):
            row_errors.append(_row_error(rn, "연도", row.get("연도"), "연도는 4자리 숫자여야 합니다"))
        if month is None or not (1 <= month <= 12):
            row_errors.append(_row_error(rn, "월", row.get("월"), "월은 1~12 사이 숫자여야 합니다"))
        if group_name not in VALID_GROUPS:
            row_errors.append(_row_error(rn, "대분류", group_name,
                                         f"유효하지 않은 대분류입니다. ({', '.join(VALID_GROUPS)} 중 하나)"))
        if not keyword:
            row_errors.append(_row_error(rn, "불만키워드", None, "불만키워드는 필수입니다"))
        if count < 0:
            row_errors.append(_row_error(rn, "개수", row.get("개수"), "0 이상의 정수여야 합니다"))

        if not any(e["row"] == rn for e in row_errors):
            records.append({
                "year": year,
                "month": month,
                "group_name": group_name,
                "keyword": keyword,
                "count": count,
            })

    if row_errors:
        return [], row_errors
    return records, []
