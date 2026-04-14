/** API ChartPoint 배열을 Recharts가 읽는 { month, 기준값, 필터값 } 배열로 변환 */
export function toChartData(
  points: Array<{ label: string; baseline?: number | null; value?: number | null }>
) {
  return points.map((p) => ({
    month: p.label,
    기준값: p.baseline ?? null,
    필터값: p.value ?? null,
  }));
}

/** 현재 날짜 기준 FilterBar 초기값 */
export function defaultFilter() {
  const now = new Date();
  return {
    groupId: null as number | null,
    branchId: null as number | null,
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
}

/** 월 수 → API months 파라미터 변환 */
export function periodToMonths(period: string): number {
  return period === "3m" ? 3 : 6;
}
