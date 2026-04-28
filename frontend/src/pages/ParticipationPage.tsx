import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { utils, writeFile } from "xlsx";
import { Download, Users } from "lucide-react";
import ScoreCard from "../components/ScoreCard";
import FilterBar, { type FilterValue } from "../components/FilterBar";
import { useParticipationSummary, useGroups, useBranches } from "../api/hooks";
import { npsDefaultFilter } from "../lib/chartUtils";

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value ?? "—"}%</span>
        </p>
      ))}
    </div>
  );
}

function ScrollableChart({
  data,
  chartType,
  filterLabel,
}: {
  data: any[];
  chartType: "line" | "bar";
  filterLabel: string;
}) {
  const needScroll = data.length > 24;
  const chartWidth = needScroll ? data.length * 50 : undefined;

  const lineChart = (w: any, h: number) => (
    <AreaChart
      width={typeof w === "number" ? w : undefined}
      height={h}
      data={data}
      margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
    >
      <defs>
        <linearGradient id="grad-p-base" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.15} />
          <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="grad-p-filter" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.25} />
          <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} interval={0} />
      <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
      <Tooltip content={<CustomTooltip />} />
      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
      <Area type="monotone" dataKey="기준값" name="기준값(전체)" stroke="#7c3aed" strokeWidth={2.5} fill="url(#grad-p-base)" dot={false} activeDot={{ r: 5 }} connectNulls />
      <Area type="monotone" dataKey="필터값" name={`필터값(${filterLabel})`} stroke="#a78bfa" strokeWidth={2.5} fill="url(#grad-p-filter)" strokeDasharray="5 3" dot={false} activeDot={{ r: 5 }} connectNulls />
    </AreaChart>
  );

  const barChart = (w: any, h: number) => (
    <BarChart
      width={typeof w === "number" ? w : undefined}
      height={h}
      data={data}
      margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
      barGap={4}
      barCategoryGap="30%"
    >
      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} interval={0} />
      <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
      <Tooltip content={<CustomTooltip />} />
      <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
      <Bar dataKey="기준값" name="기준값(전체)" fill="#7c3aed" radius={[5, 5, 0, 0]} maxBarSize={30} />
      <Bar dataKey="필터값" name={`필터값(${filterLabel})`} fill="#a78bfa" radius={[5, 5, 0, 0]} maxBarSize={30} />
    </BarChart>
  );

  if (needScroll) {
    return (
      <div className="overflow-x-auto">
        <div style={{ width: chartWidth, height: 260 }}>
          {chartType === "line" ? lineChart(chartWidth, 260) : barChart(chartWidth, 260)}
        </div>
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      {chartType === "line" ? lineChart("100%", 260) : barChart("100%", 260)}
    </ResponsiveContainer>
  );
}

export default function ParticipationPage() {
  const [filter, setFilter] = useState<FilterValue>(npsDefaultFilter());
  const [chartType, setChartType] = useState<"line" | "bar">("bar");

  const { data: groups = [] } = useGroups();
  const { data: branches = [] } = useBranches(filter.groupId);
  const selectedGroup = groups.find((g) => g.id === filter.groupId);
  const selectedBranch = branches.find((b) => b.id === filter.branchId);
  const filterLabel = selectedBranch?.name ?? selectedGroup?.name ?? "필터";

  const { data, isLoading } = useParticipationSummary({
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

  const chartData = baselineSeries.map((b: any, i: number) => ({
    month: b.x,
    기준값: b.rate ?? null,
    필터값: filteredSeries[i]?.rate ?? null,
  }));

  const months = baselineSeries.map((b: any) => b.x);
  const needTableScroll = months.length > 24;

  function handleDownload() {
    const rows = baselineSeries.map((b: any, i: number) => {
      const [year, month] = b.x.split("-").map(Number);
      return {
        연도: year,
        월: month,
        [`전체 참여율(%)`]: b.rate ?? "",
        [`${filterLabel} 참여율(%)`]: filteredSeries[i]?.rate ?? "",
      };
    });
    const ws = utils.json_to_sheet(rows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "참여율");
    writeFile(wb, `참여율_${filter.startYear}${String(filter.startMonth).padStart(2,"0")}-${filter.endYear}${String(filter.endMonth).padStart(2,"0")}.xlsx`);
  }

  const TABLE_ROWS = [
    { label: "전체 참여율%", key: "rate", source: baselineSeries },
    { label: `${filterLabel} 참여율%`, key: "rate", source: filteredSeries },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <FilterBar value={filter} onChange={setFilter} />
        </div>
        <button
          onClick={handleDownload}
          disabled={baselineSeries.length === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-medium text-gray-600 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm whitespace-nowrap"
        >
          <Download size={15} />
          엑셀 다운로드
        </button>
      </div>

      {/* 스코어카드 — 전체값 + 필터값 한 줄 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold text-gray-400 mb-2 px-1">전체값</p>
          <ScoreCard
            title="참여율 (전체 평균)"
            value={scorecard.baseline_avg_rate ?? null}
            unit="%"
            icon={Users}
            iconColor="bg-violet-100"
            loading={isLoading}
          />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 mb-2 px-1">필터값</p>
          <ScoreCard
            title={`참여율 (${filterLabel})`}
            value={scorecard.filtered_avg_rate ?? null}
            unit="%"
            icon={Users}
            iconColor="bg-indigo-50"
            loading={isLoading}
          />
        </div>
      </div>

      {/* 참여율 추이 차트 */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-700">참여율 추이</h3>
            <p className="text-xs text-gray-400 mt-0.5">기준값(전체) vs 필터값({filterLabel})</p>
          </div>
          <button
            onClick={() => setChartType((t) => (t === "line" ? "bar" : "line"))}
            className="text-xs px-3 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
          >
            {chartType === "line" ? "막대로 전환" : "꺾은선으로 전환"}
          </button>
        </div>
        <ScrollableChart data={chartData} chartType={chartType} filterLabel={filterLabel} />
      </div>

      {/* 참여율 월별 상세 데이터 테이블 */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-700">참여율 월별 상세 데이터</h3>
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
                          {val != null ? `${val}%` : <span className="text-gray-300">—</span>}
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
