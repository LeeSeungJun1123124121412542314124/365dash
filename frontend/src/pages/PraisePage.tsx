import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { Star } from "lucide-react";
import ScoreCard from "../components/ScoreCard";
import FilterBar, { type FilterValue } from "../components/FilterBar";
import { usePraiseSummary } from "../api/hooks";
import { defaultFilter, seriesToDualChart } from "../lib/chartUtils";

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

export default function PraisePage() {
  const [filter, setFilter] = useState<FilterValue>(defaultFilter());

  const { data, isLoading } = usePraiseSummary({
    start_year: filter.startYear,
    start_month: filter.startMonth,
    end_year: filter.endYear,
    end_month: filter.endMonth,
    group_id: filter.groupId,
    branch_id: filter.branchId,
  });

  const scorecard = data?.scorecard ?? {};
  const chartData = seriesToDualChart(data?.chart?.series, "total");

  return (
    <div className="space-y-5">
      <FilterBar value={filter} onChange={setFilter} />

      {/* 스코어카드 */}
      <div className="grid grid-cols-2 gap-4">
        <ScoreCard
          title="기준값 칭찬총계 (전체)"
          value={scorecard.baseline_total ?? null}
          unit="건"
          icon={Star}
          iconColor="bg-amber-100"
          loading={isLoading}
        />
        <ScoreCard
          title="필터값 칭찬총계 (선택)"
          value={scorecard.filtered_total ?? null}
          unit="건"
          icon={Star}
          iconColor="bg-yellow-100"
          loading={isLoading}
        />
      </div>

      {/* 칭찬 비교 차트 */}
      <div className="card p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-gray-700">칭찬현황 비교</h3>
          <p className="text-xs text-gray-400 mt-0.5">기준값 vs 필터값 클러스터 막대</p>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barGap={4} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} interval={0} />
            <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} unit="건" />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="기준값" fill="#7c3aed" radius={[5, 5, 0, 0]} maxBarSize={30} />
            <Bar dataKey="필터값" fill="#c4b5fd" radius={[5, 5, 0, 0]} maxBarSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
