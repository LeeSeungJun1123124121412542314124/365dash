import { useState } from "react";
import { ThumbsDown } from "lucide-react";
import ScoreCard from "../components/ScoreCard";
import FilterBar, { type FilterValue } from "../components/FilterBar";
import ScrollableBarChart from "../components/ScrollableBarChart";
import { useComplaintSummary, useComplaintKeywords, useGroups } from "../api/hooks";
import { npsDefaultFilter, seriesToDualChart } from "../lib/chartUtils";


export default function ComplaintPage() {
  const [tab, setTab] = useState<"overview" | "keywords">("overview");
  const [filter, setFilter] = useState<FilterValue>(npsDefaultFilter());
  const [chartType, setChartType] = useState<"bar" | "line">("bar");

  const { data: groups = [] } = useGroups();
  // 불만은 대분류 단위 집계 — 중분류는 사용하지 않음
  const selectedGroup = groups.find((g) => g.id === filter.groupId);
  const filterLabel = selectedGroup?.name ?? "필터";

  const { data: summaryData, isLoading: summaryLoading } = useComplaintSummary({
    start_year: filter.startYear,
    start_month: filter.startMonth,
    end_year: filter.endYear,
    end_month: filter.endMonth,
    group_id: filter.groupId,
    branch_id: null,
  });

  const { data: keywordData, isLoading: keywordLoading } = useComplaintKeywords({
    start_year: filter.startYear,
    start_month: filter.startMonth,
    end_year: filter.endYear,
    end_month: filter.endMonth,
    group_id: filter.groupId,
    branch_id: null,
  });

  const scorecard = summaryData?.scorecard ?? {};
  const baselineSeries: any[] = summaryData?.chart?.series?.[0]?.data ?? [];
  const filteredSeries: any[] = summaryData?.chart?.series?.[1]?.data ?? [];
  const chartData = seriesToDualChart(summaryData?.chart?.series, "total");
  const keywordRows: any[] = keywordData?.rows ?? [];

  const months = baselineSeries.map((b: any) => b.x);
  const needTableScroll = months.length > 24;

  // 불만 키워드 피벗: (연,월,대분류) 단위로 키워드를 컬럼으로 재배치
  const KEYWORDS = [
    "주차", "안내 응대부족", "대기관련", "불친절",
    "시스템불만", "개인정보", "환경불만", "기타",
  ];
  const pivotMap = new Map<string, any>();
  for (const r of keywordRows) {
    const key = `${r.year}-${r.month}-${r.group_name}`;
    if (!pivotMap.has(key)) {
      const empty: any = { year: r.year, month: r.month, group_name: r.group_name, total: 0 };
      KEYWORDS.forEach((k) => (empty[k] = 0));
      pivotMap.set(key, empty);
    }
    const row = pivotMap.get(key);
    if (KEYWORDS.includes(r.keyword)) {
      row[r.keyword] = (row[r.keyword] ?? 0) + (r.count ?? 0);
    } else {
      row["기타"] = (row["기타"] ?? 0) + (r.count ?? 0);
    }
    row.total += r.count ?? 0;
  }
  const pivotedKeywordRows = Array.from(pivotMap.values()).sort(
    (a, b) => b.year - a.year || b.month - a.month || a.group_name.localeCompare(b.group_name),
  );

  const TABLE_ROWS = [
    { label: "전체 불만총계", key: "total", source: baselineSeries },
    { label: `${filterLabel} 불만총계`, key: "total", source: filteredSeries },
  ];

  return (
    <div className="space-y-5">
      {/* 탭 */}
      <div className="flex gap-1 bg-white rounded-2xl p-1 shadow-sm w-fit">
        {(["overview", "keywords"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === t ? "bg-violet-600 text-white shadow" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "overview" ? "불만 현황" : "키워드"}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <FilterBar value={filter} onChange={setFilter} showBranch={false} />

          {/* 스코어카드 — 전체값 + 필터값 한 줄 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-2 px-1">전체값</p>
              <ScoreCard
                title="불만총계 (전체)"
                value={scorecard.baseline_total ?? null}
                unit="건"
                icon={ThumbsDown}
                iconColor="bg-red-100"
                loading={summaryLoading}
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-2 px-1">필터값</p>
              <ScoreCard
                title={`불만총계 (${filterLabel})`}
                value={scorecard.filtered_total ?? null}
                unit="건"
                icon={ThumbsDown}
                iconColor="bg-orange-50"
                loading={summaryLoading}
              />
            </div>
          </div>

          {/* 불만 비교 차트 */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-700">불만현황 비교</h3>
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
              baseColor="#ef4444"
              filterColor="#fca5a5"
              chartType={chartType}
            />
          </div>

          {/* 불만 월별 상세 데이터 테이블 */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-700">불만 월별 상세 데이터</h3>
              <p className="text-xs text-gray-400 mt-0.5">전체값 + {filterLabel} 기간별 수치</p>
            </div>
            {summaryLoading ? (
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
        </>
      )}

      {tab === "keywords" && (
        <>
          <FilterBar value={filter} onChange={setFilter} showBranch={false} showNpsLevel={false} />

          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-700">불만 키워드 현황</h3>
              <p className="text-xs text-gray-400 mt-0.5">키워드별 건수</p>
            </div>
            {keywordLoading ? (
              <div className="p-8 text-center text-sm text-gray-400">불러오는 중...</div>
            ) : pivotedKeywordRows.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">데이터가 없습니다.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-sky-100 border-b border-sky-200">
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 whitespace-nowrap border-r border-sky-200">연도</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 whitespace-nowrap border-r border-sky-200">월</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 whitespace-nowrap border-r border-sky-200">대분류</th>
                      {KEYWORDS.map((k) => (
                        <th key={k} className="px-3 py-3 text-center text-xs font-bold text-gray-700 whitespace-nowrap border-r border-sky-200">
                          {k}
                        </th>
                      ))}
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 whitespace-nowrap">총개수<br />(계산)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pivotedKeywordRows.map((row: any, i: number) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-violet-50/40 transition-colors">
                        <td className="px-3 py-2.5 text-center text-gray-600 border-r border-gray-100">{row.year}</td>
                        <td className="px-3 py-2.5 text-center text-gray-600 border-r border-gray-100">{row.month}월</td>
                        <td className="px-3 py-2.5 font-medium text-gray-700 border-r border-gray-100">{row.group_name}</td>
                        {KEYWORDS.map((k) => (
                          <td key={k} className="px-3 py-2.5 text-center text-gray-700 border-r border-gray-100">
                            {(row[k] ?? 0) > 0 ? row[k] : <span className="text-gray-300">—</span>}
                          </td>
                        ))}
                        <td className="px-3 py-2.5 text-center font-bold text-red-600">
                          {row.total > 0 ? row.total : <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
