import { useState } from "react";
import { Star } from "lucide-react";
import ScoreCard from "../components/ScoreCard";
import FilterBar, { type FilterValue } from "../components/FilterBar";
import ScrollableBarChart from "../components/ScrollableBarChart";
import { usePraiseSummary, useGroups, useBranches } from "../api/hooks";
import { npsDefaultFilter, seriesToDualChart } from "../lib/chartUtils";

export default function PraisePage() {
  const [filter, setFilter] = useState<FilterValue>(npsDefaultFilter());
  const [chartType, setChartType] = useState<"bar" | "line">("bar");

  const { data: groups = [] } = useGroups();
  const { data: branches = [] } = useBranches(filter.groupId);
  const selectedGroup = groups.find((g) => g.id === filter.groupId);
  const selectedBranch = branches.find((b) => b.id === filter.branchId);
  const filterLabel = selectedBranch?.name ?? selectedGroup?.name ?? "필터";

  const { data, isLoading } = usePraiseSummary({
    start_year: filter.startYear,
    start_month: filter.startMonth,
    end_year: filter.endYear,
    end_month: filter.endMonth,
    group_id: filter.groupId,
    branch_id: filter.branchId,
  });

  const scorecard = data?.scorecard ?? {};
  const baselineSeries: any[] = data?.chart?.series?.[0]?.data ?? [];
  const filteredSeries: any[] = data?.chart?.series?.[1]?.data ?? [];
  const chartData = seriesToDualChart(data?.chart?.series, "total");

  const months = baselineSeries.map((b: any) => b.x);
  const needTableScroll = months.length > 24;

  const TABLE_ROWS = [
    { label: "전체 칭찬총계", key: "total", source: baselineSeries },
    { label: `${filterLabel} 칭찬총계`, key: "total", source: filteredSeries },
  ];

  return (
    <div className="space-y-5">
      <FilterBar value={filter} onChange={setFilter} />

      {/* 스코어카드 — 전체값 + 필터값 한 줄 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold text-gray-400 mb-2 px-1">전체값</p>
          <ScoreCard
            title="칭찬총계 (전체)"
            value={scorecard.baseline_total ?? null}
            unit="건"
            icon={Star}
            iconColor="bg-amber-100"
            loading={isLoading}
          />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 mb-2 px-1">필터값</p>
          <ScoreCard
            title={`칭찬총계 (${filterLabel})`}
            value={scorecard.filtered_total ?? null}
            unit="건"
            icon={Star}
            iconColor="bg-yellow-50"
            loading={isLoading}
          />
        </div>
      </div>

      {/* 칭찬 비교 차트 */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-700">칭찬현황 비교</h3>
            <p className="text-xs text-gray-400 mt-0.5">기준값(전체) vs 필터값({filterLabel})</p>
          </div>
          <button
            onClick={() => setChartType((t) => (t === "bar" ? "line" : "bar"))}
            className="text-xs px-3 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
          >
            {chartType === "bar" ? "꺾은선으로 전환" : "막대로 전환"}
          </button>
        </div>
        <ScrollableBarChart
          data={chartData}
          filterLabel={filterLabel}
          baseColor="#7c3aed"
          filterColor="#c4b5fd"
          chartType={chartType}
        />
      </div>

      {/* 칭찬 월별 상세 데이터 테이블 */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-700">칭찬 월별 상세 데이터</h3>
          <p className="text-xs text-gray-400 mt-0.5">전체값 + {filterLabel} 기간별 수치</p>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">불러오는 중...</div>
        ) : months.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">데이터가 없습니다.</div>
        ) : (
          <div className={needTableScroll ? "overflow-x-auto" : ""}>
            <table
              className="w-full text-xs border-collapse"
              style={needTableScroll ? { minWidth: months.length * 70 + 160 } : {}}
            >
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap sticky left-0 bg-gray-50 z-10">
                    구분
                  </th>
                  {months.map((m: string) => (
                    <th key={m} className="px-3 py-3 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TABLE_ROWS.map(({ label, key, source }, ri) => (
                  <tr
                    key={label}
                    className={`border-b border-gray-50 ${ri === 0 ? "border-b-2 border-gray-200" : ""} hover:bg-violet-50/30 transition-colors`}
                  >
                    <td className="px-4 py-2.5 font-medium text-gray-600 whitespace-nowrap sticky left-0 bg-white z-10">
                      {label}
                    </td>
                    {source.map((d: any, ci: number) => {
                      const val = d[key];
                      return (
                        <td key={ci} className="px-3 py-2.5 text-center text-gray-700">
                          {val != null ? val.toLocaleString() : <span className="text-gray-300">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
