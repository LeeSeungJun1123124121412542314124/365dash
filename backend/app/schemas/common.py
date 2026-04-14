"""공통 응답 스키마."""
from typing import Any, Optional
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"


class ErrorDetail(BaseModel):
    row: int
    column: str
    value: Optional[Any] = None   # 입력된 실제 값 (§4.0 에러 보고)
    message: str


class UploadResponse(BaseModel):
    success: bool
    uploaded_count: int = 0   # §5.7~5.10: uploaded_count 필드명
    errors: list[ErrorDetail] = []


class ScoreCard(BaseModel):
    label: str
    value: Optional[float] = None
    unit: str = ""
    change: Optional[float] = None   # 전월 대비 증감


class ChartPoint(BaseModel):
    label: str               # x축 레이블 (예: "2025-10")
    value: Optional[float] = None
    baseline: Optional[float] = None  # 기준값 (막대 클러스터용)
