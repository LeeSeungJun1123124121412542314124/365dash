import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp } from "lucide-react";
import ScoreCard from "../components/ScoreCard";
import FilterBar, { type FilterValue } from "../components/FilterBar";
import PeriodSelector from "../components/PeriodSelector";
import { useNpsSummary } from "../api/hooks";
import { defaultFilter, periodToMonths, seriesToDualChart } from "../lib/chartUtils";

const PERIOD_OPTIONS = [
  { label: "3개월", value: "3m" },
  { label: "6개월", value: "6m" },
];

// npsLevel 선택 → series valueKey 매핑
const NPS_KEY: Record<string, string> = {
  "전체":    "very_satisfied_pct",
  "매우만족": "very_satisfied_pct",
  "만족":    "satisfied_pct",
  "보통이하": "below_normal_pct",
};

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

export default function NpsPage() {
  const [filter, setFilter] = useState<FilterValue>(defaultFilter());
  const [period, setPeriod] = useState("6m");
  const [showBaseline, setShowBaseline] = useState(true);
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [npsLevel, setNpsLevel] = useState("전체");

  const months = periodToMonths(period);
  const { data, isLoading } = useNpsSummary({
    months,
    group_id: filter.groupId,
    branch_id: filter.branchId,
  });

  const scorecard = data?.scorecard ?? {};
  const valueKey = NPS_KEY[npsLevel] ?? "very_satisfied_pct";
  const chartData = seriesToDualChart(data?.chart?.series, valueKey);

  return (
    <div className="space-y-5">
      <FilterBar
        value={filter}
        onChange={setFilter}
        showNpsLevel
        npsLevel={npsLevel}
        onNpsLevelChange={setNpsLevel}
      />

      {/* 스코어카드 */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <ScoreCard
          title="매우만족"
          value={scorecard.very_satisfied?.count ?? null}
          unit={`건 (${scorecard.very_satisfied?.pct ?? "—"}%)`}
          icon={TrendingUp}
          iconColor="bg-green-100"
          loading={isLoading}
        />
        <ScoreCard
          title="만족"
          value={scorecard.satisfied?.count ?? null}
          unit={`건 (${scorecard.satisfied?.pct ?? "—"}%)`}
          icon={TrendingUp}
          iconColor="bg-blue-100"
          loading={isLoading}
        />
        <ScoreCard
          title="보통이하"
          value={scorecard.below_normal?.count ?? null}
          unit={`건 (${scorecard.below_normal?.pct ?? "—"}%)`}
          icon={TrendingUp}
          iconColor="bg-red-100"
          loading={isLoading}
        />
      </div>

      {/* NPS 추이 차트 */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-700">NPS 추이</h3>
            <p className="text-xs text-gray-400 mt-0.5">기준값 vs 필터값 비교</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBaseline((v) => !v)}
              className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
                showBaseline
                  ? "border-violet-300 text-violet-600 bg-violet-50"
                  : "border-gray-200 text-gray-400"
              }`}
            >
              기준값 {showBaseline ? "숨기기" : "표시"}
            </button>
            <button
              onClick={() => setChartType((t) => (t === "line" ? "bar" : "line"))}
              className="text-xs px-3 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              {chartType === "line" ? "막대로 전환" : "꺾은선으로 전환"}
            </button>
            <PeriodSelector options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          {chartType === "line" ? (
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="grad-nps-base" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="grad-nps-filter" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              {showBaseline && (
                <Area type="monotone" dataKey="기준값" stroke="#2563eb" strokeWidth={2.5} fill="url(#grad-nps-base)" dot={false} activeDot={{ r: 5 }} connectNulls />
              )}
              <Area type="monotone" dataKey="필터값" stroke="#60a5fa" strokeWidth={2.5} fill="url(#grad-nps-filter)" strokeDasharray="5 3" dot={false} activeDot={{ r: 5 }} connectNulls />
            </AreaChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barGap={4} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              {showBaseline && (
                <Bar dataKey="기준값" fill="#2563eb" radius={[5, 5, 0, 0]} maxBarSize={30} />
              )}
              <Bar dataKey="필터값" fill="#60a5fa" radius={[5, 5, 0, 0]} maxBarSize={30} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
