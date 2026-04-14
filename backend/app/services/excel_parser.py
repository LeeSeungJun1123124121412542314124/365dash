"""
엑셀 업로드 파서 — §4 업로드 명세 기반.
4종 양식(participation / nps / praise / complaint) 각각 parse_* 함수 제공.
반환: (records: list[dict], errors: list[dict])
"""
from io import BytesIO

import pandas as pd


# ──────────────────────────────────────────
# 공통 유틸
# ──────────────────────────────────────────

def _row_error(row_num: int, column: str, message: str) -> dict:
    return {"row": row_num, "column": column, "message": message}


def _check_required(df: pd.DataFrame, required_cols: list[str]) -> list[dict]:
    errors = []
    for col in required_cols:
        if col not in df.columns:
            errors.append({"row": 0, "column": col, "message": f"필수 컬럼 '{col}'이 없습니다."})
    return errors


# ──────────────────────────────────────────
# 참여율
# ──────────────────────────────────────────

PARTICIPATION_REQUIRED = ["연도", "월", "지점명", "참여대상", "참여자"]


def parse_participation(file_bytes: bytes) -> tuple[list[dict], list[dict]]:
    df = pd.read_excel(BytesIO(file_bytes), dtype={"연도": int, "월": int})
    errors = _check_required(df, PARTICIPATION_REQUIRED)
    if errors:
        return [], errors

    records, row_errors = [], []
    for idx, row in df.iterrows():
        rn = idx + 2
        year, month = int(row["연도"]), int(row["월"])
        if not (2020 <= year <= 2099):
            row_errors.append(_row_error(rn, "연도", "2020~2099 사이여야 합니다."))
        if not (1 <= month <= 12):
            row_errors.append(_row_error(rn, "월", "1~12 사이여야 합니다."))
        if pd.isna(row["지점명"]) or str(row["지점명"]).strip() == "":
            row_errors.append(_row_error(rn, "지점명", "필수값입니다."))
        target = int(row["참여대상"]) if not pd.isna(row["참여대상"]) else None
        participant = int(row["참여자"]) if not pd.isna(row["참여자"]) else None
        if target is None or target < 0:
            row_errors.append(_row_error(rn, "참여대상", "0 이상의 정수여야 합니다."))
        if participant is None or participant < 0:
            row_errors.append(_row_error(rn, "참여자", "0 이상의 정수여야 합니다."))
        if not row_errors or all(e["row"] != rn for e in row_errors):
            records.append({
                "year": year,
                "month": month,
                "branch_name": str(row["지점명"]).strip(),
                "target_count": target,
                "participant_count": participant,
            })
    return records, row_errors


# ──────────────────────────────────────────
# NPS
# ──────────────────────────────────────────

NPS_REQUIRED = ["연도", "월", "지점명", "매우만족", "만족", "보통", "불만족", "매우불만족"]


def parse_nps(file_bytes: bytes) -> tuple[list[dict], list[dict]]:
    df = pd.read_excel(BytesIO(file_bytes), dtype={"연도": int, "월": int})
    errors = _check_required(df, NPS_REQUIRED)
    if errors:
        return [], errors

    records, row_errors = [], []
    for idx, row in df.iterrows():
        rn = idx + 2
        for col in ["매우만족", "만족", "보통", "불만족", "매우불만족"]:
            val = row[col]
            if pd.isna(val) or int(val) < 0:
                row_errors.append(_row_error(rn, col, "0 이상의 정수여야 합니다."))
        if not any(e["row"] == rn for e in row_errors):
            records.append({
                "year": int(row["연도"]),
                "month": int(row["월"]),
                "branch_name": str(row["지점명"]).strip(),
                "very_satisfied": int(row["매우만족"]),
                "satisfied": int(row["만족"]),
                "neutral": int(row["보통"]),
                "dissatisfied": int(row["불만족"]),
                "very_dissatisfied": int(row["매우불만족"]),
            })
    return records, row_errors


# ──────────────────────────────────────────
# 칭찬
# ──────────────────────────────────────────

PRAISE_REQUIRED = ["연도", "월", "지점명", "수술", "람스", "람스+시술"]


def parse_praise(file_bytes: bytes) -> tuple[list[dict], list[dict]]:
    df = pd.read_excel(BytesIO(file_bytes), dtype={"연도": int, "월": int})
    errors = _check_required(df, PRAISE_REQUIRED)
    if errors:
        return [], errors

    records, row_errors = [], []
    for idx, row in df.iterrows():
        rn = idx + 2
        for col in ["수술", "람스", "람스+시술"]:
            val = row[col]
            if pd.isna(val) or int(val) < 0:
                row_errors.append(_row_error(rn, col, "0 이상의 정수여야 합니다."))
        if not any(e["row"] == rn for e in row_errors):
            records.append({
                "year": int(row["연도"]),
                "month": int(row["월"]),
                "branch_name": str(row["지점명"]).strip(),
                "surgery_count": int(row["수술"]),
                "lams_count": int(row["람스"]),
                "lams_surgery_count": int(row["람스+시술"]),
            })
    return records, row_errors


# ──────────────────────────────────────────
# 불만
# ──────────────────────────────────────────

COMPLAINT_REQUIRED = [
    "연도", "월", "지점명", "수술", "람스", "람스+시술",
    "주차", "안내·응대부족", "대기관련", "불친절",
    "시스템불만", "개인정보", "환경불만", "기타",
]

CATEGORY_COLS = {
    "주차": "parking",
    "안내·응대부족": "guidance",
    "대기관련": "waiting",
    "불친절": "rudeness",
    "시스템불만": "system",
    "개인정보": "privacy",
    "환경불만": "environment",
    "기타": "other",
}


def parse_complaint(file_bytes: bytes) -> tuple[list[dict], list[dict]]:
    df = pd.read_excel(BytesIO(file_bytes), dtype={"연도": int, "월": int})
    errors = _check_required(df, COMPLAINT_REQUIRED)
    if errors:
        return [], errors

    records, row_errors = [], []
    for idx, row in df.iterrows():
        rn = idx + 2
        all_num_cols = ["수술", "람스", "람스+시술"] + list(CATEGORY_COLS.keys())
        for col in all_num_cols:
            val = row[col]
            if pd.isna(val) or int(val) < 0:
                row_errors.append(_row_error(rn, col, "0 이상의 정수여야 합니다."))
        if not any(e["row"] == rn for e in row_errors):
            rec = {
                "year": int(row["연도"]),
                "month": int(row["월"]),
                "branch_name": str(row["지점명"]).strip(),
                "surgery_count": int(row["수술"]),
                "lams_count": int(row["람스"]),
                "lams_surgery_count": int(row["람스+시술"]),
            }
            for col_kr, col_en in CATEGORY_COLS.items():
                rec[col_en] = int(row[col_kr])
            records.append(rec)
    return records, row_errors
