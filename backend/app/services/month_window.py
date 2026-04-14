"""
월 집계 윈도우 계산: 전월 26일 00:00 ~ 당월 25일 23:59
"""
from datetime import date, datetime


def get_month_window(year: int, month: int) -> tuple[date, date]:
    """
    (year, month) 기준의 집계 기간 반환.
    반환: (start_date, end_date) — start는 전월 26일, end는 당월 25일
    """
    if month == 1:
        start = date(year - 1, 12, 26)
    else:
        start = date(year, month - 1, 26)
    end = date(year, month, 25)
    return start, end


def get_recent_months(base_year: int, base_month: int, n: int = 6) -> list[tuple[int, int]]:
    """
    base_month 포함 최근 n개월의 (year, month) 목록을 오름차순 반환.
    데이터가 부족한 월은 있는 것만 평균 계산 — 목록 기준만 제공.
    """
    months = []
    y, m = base_year, base_month
    for _ in range(n):
        months.append((y, m))
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    months.reverse()
    return months
