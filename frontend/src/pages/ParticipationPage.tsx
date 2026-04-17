import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { Users } from "lucide-react";
import ScoreCard from "../components/ScoreCard";
import FilterBar, { type FilterValue } from "../components/FilterBar";
import { useParticipationSummary } from "../api/hooks";
import { defaultFilter, seriesToDualChart } from "../lib/chartUtils";

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

export default function ParticipationPage() {
  const [filter, setFilter] = useState<FilterValue>(defaultFilter());

  const { data, isLoading } = useParticipationSummary({
    start_year: filter.startYear,
    start_month: filter.startMonth,
    end_year: filter.endYear,
    end_month: filter.endMonth,
    group_id: filter.groupId,
    branch_id: filter.branchId,
  });

  const scorecard = data?.scorecard;
  const chartData = seriesToDualChart(data?.chart?.series, "rate");

  return (
    <div className="space-y-5">
      <FilterBar value={filter} onChange={setFilter} />

      {/* 스코어카드 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <ScoreCard
          title="이번 달 참여율"
          value={scorecard?.current_month_rate ?? null}
          unit="%"
          icon={Users}
          iconColor="bg-violet-100"
          loading={isLoading}
        />
        <ScoreCard
          title="기준값 (전체 평균)"
          value={chartData.length ? (chartData[chartData.length - 1].기준값 ?? null) : null}
          unit="%"
          icon={Users}
          iconColor="bg-blue-100"
          loading={isLoading}
        />
        <ScoreCard
          title="기간 평균 참여율"
          value={
            chartData.length
              ? Math.round(
                  chartData.reduce((s, r) => s + (r.필터값 ?? 0), 0) / chartData.length * 10
                ) / 10
              : null
          }
          unit="%"
          icon={Users}
          iconColor="bg-indigo-100"
          loading={isLoading}
        />
      </div>

      {/* 차트 */}
      <div className="card p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-gray-700">참여율 추이</h3>
          <p className="text-xs text-gray-400 mt-0.5">기준값(전체 평균) vs 필터값 비교</p>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
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
            <Area type="monotone" dataKey="기준값" stroke="#7c3aed" strokeWidth={2.5} fill="url(#grad-p-base)" dot={false} activeDot={{ r: 5 }} connectNulls />
            <Area type="monotone" dataKey="필터값" stroke="#a78bfa" strokeWidth={2.5} fill="url(#grad-p-filter)" strokeDasharray="5 3" dot={false} activeDot={{ r: 5 }} connectNulls />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
