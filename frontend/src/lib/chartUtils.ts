/** 새 API series 포맷 → Recharts { month, 기준값, 필터값 } 배열 변환
 *  valueKey: data 항목에서 사용할 필드명 (예: "total", "rate")
 */
export function seriesToDualChart(
  series: Array<{ label: string; data: Array<{ x: string; [key: string]: any }> }> | undefined,
  valueKey: string
): Array<{ month: string; 기준값: number | null; 필터값: number | null }> {
  if (!series || series.length === 0) return [];
  const base = series[0]?.data ?? [];
  const filt = series[1]?.data ?? [];
  return base.map((b, i) => ({
    month: b.x,
    기준값: b[valueKey] ?? null,
    필터값: filt[i]?.[valueKey] ?? null,
  }));
}

/** 이전 호환: {label, baseline, value} 배열 → Recharts 변환 (MainDashboard 단순 차트용) */
export function toChartData(
  points: Array<{ label: string; baseline?: number | null; value?: number | null }>
) {
  return points.map((p) => ({
    month: p.label,
    기준값: p.baseline ?? null,
    필터값: p.value ?? null,
  }));
}

/** NPS 페이지 전용 초기값 (끝=현재월, 시작=3년 전 동월) */
export function npsDefaultFilter() {
  const now = new Date();
  const endYear = now.getFullYear();
  const endMonth = now.getMonth() + 1;
  return {
    groupId: null as number | null,
    branchId: null as number | null,
    startYear: endYear - 3,
    startMonth: endMonth,
    endYear,
    endMonth,
  };
}

/** 현재 날짜 기준 FilterBar 초기값 (끝=현재월, 시작=1년 전 동월) */
export function defaultFilter() {
  const now = new Date();
  const endYear = now.getFullYear();
  const endMonth = now.getMonth() + 1;
  // 1년 전 동월
  const startYear = endYear - 1;
  const startMonth = endMonth;
  return {
    groupId: null as number | null,
    branchId: null as number | null,
    startYear,
    startMonth,
    endYear,
    endMonth,
  };
}
