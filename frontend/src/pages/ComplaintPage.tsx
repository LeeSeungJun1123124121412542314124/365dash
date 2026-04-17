import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { ThumbsDown } from "lucide-react";
import ScoreCard from "../components/ScoreCard";
import FilterBar, { type FilterValue } from "../components/FilterBar";
import { useComplaintSummary, useComplaintKeywords } from "../api/hooks";
import { defaultFilter, seriesToDualChart } from "../lib/chartUtils";

const KEYWORD_COLS = [
  "주차", "안내 응대부족", "대기관련", "불친절",
  "시스템불만", "개인정보", "환경불만", "기타",
] as const;

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value ?? "—"}건</span>
        </p>
      ))}
    </div>
  );
}

export default function ComplaintPage() {
  const [tab, setTab] = useState<"overview" | "keywords">("overview");
  const [filter, setFilter] = useState<FilterValue>(defaultFilter());

  const { data: summaryData, isLoading: summaryLoading } = useComplaintSummary({
    start_year: filter.startYear,
    start_month: filter.startMonth,
    end_year: filter.endYear,
    end_month: filter.endMonth,
    group_id: filter.groupId,
    branch_id: filter.branchId,
  });

  const { data: keywordData, isLoading: keywordLoading } = useComplaintKeywords({
    year: tab === "keywords" ? filter.endYear : null,
    month: tab === "keywords" ? filter.endMonth : null,
    group_id: filter.groupId,
    branch_id: filter.branchId,
  });

  const scorecard = summaryData?.scorecard ?? {};
  const chartData = seriesToDualChart(summaryData?.chart?.series, "total");
  const keywordRows: any[] = keywordData?.rows ?? [];

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
          <FilterBar value={filter} onChange={setFilter} />

          <div className="grid grid-cols-2 gap-4">
            <ScoreCard title="기준값 불만총계 (전체)" value={scorecard.baseline_total ?? null} unit="건" icon={ThumbsDown} iconColor="bg-red-100"    loading={summaryLoading} />
            <ScoreCard title="필터값 불만총계 (선택)" value={scorecard.filtered_total ?? null} unit="건" icon={ThumbsDown} iconColor="bg-orange-100" loading={summaryLoading} />
          </div>

          <div className="card p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-gray-700">불만현황 비교</h3>
              <p className="text-xs text-gray-400 mt-0.5">기준값 vs 필터값 클러스터 막대</p>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barGap={4} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} unit="건" />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="기준값" fill="#ef4444" radius={[5, 5, 0, 0]} maxBarSize={30} />
                <Bar dataKey="필터값" fill="#fca5a5" radius={[5, 5, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {tab === "keywords" && (
        <>
          <FilterBar value={filter} onChange={setFilter} showNpsLevel={false} />

          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-700">불만 키워드 현황</h3>
              <p className="text-xs text-gray-400 mt-0.5">8개 카테고리별 건수</p>
            </div>
            {keywordLoading ? (
              <div className="p-8 text-center text-sm text-gray-400">불러오는 중...</div>
            ) : keywordRows.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">데이터가 없습니다.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">연도</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">월</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">지점명</th>
                      {KEYWORD_COLS.map((col) => (
                        <th key={col} className="px-4 py-3 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {keywordRows.map((row, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-violet-50/40 transition-colors">
                        <td className="px-4 py-3 text-gray-600">{row.year}</td>
                        <td className="px-4 py-3 text-gray-600">{row.month}월</td>
                        <td className="px-4 py-3 font-medium text-gray-700">{row.branch_name}</td>
                        {KEYWORD_COLS.map((col) => (
                          <td key={col} className="px-4 py-3 text-center">
                            {(row[col] ?? 0) > 0 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs font-semibold">
                                {row[col]}
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        ))}
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
