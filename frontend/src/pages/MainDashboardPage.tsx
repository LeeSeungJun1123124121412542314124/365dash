import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, Star, ThumbsDown, Users } from "lucide-react";
import ScoreCard from "../components/ScoreCard";
import PeriodSelector from "../components/PeriodSelector";
import { useDashboardMain } from "../api/hooks";
import { toChartData, periodToMonths } from "../lib/chartUtils";

const PERIOD_OPTIONS = [
  { label: "3개월", value: "3m" },
  { label: "6개월", value: "6m" },
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value ?? "—"}</span>
        </p>
      ))}
    </div>
  );
}

function ChartCard({
  title, children, period, onPeriodChange,
}: {
  title: string;
  children: React.ReactNode;
  period: string;
  onPeriodChange: (v: string) => void;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-700">{title}</h3>
        <PeriodSelector options={PERIOD_OPTIONS} value={period} onChange={onPeriodChange} />
      </div>
      {children}
    </div>
  );
}

const ICONS = [
  { icon: Users,     color: "bg-violet-100" },
  { icon: TrendingUp, color: "bg-blue-100" },
  { icon: Star,      color: "bg-amber-100" },
  { icon: ThumbsDown, color: "bg-red-100" },
];

export default function MainDashboardPage() {
  const [period, setPeriod] = useState("6m");
  const months = periodToMonths(period);
  const { data, isLoading } = useDashboardMain(months);

  const scorecards: any[] = data?.scorecards ?? [];
  const participationTrend = toChartData(data?.participation_trend ?? []);
  const npsTrend          = toChartData(data?.nps_trend ?? []);
  const praiseComparison  = toChartData(data?.praise_comparison ?? []);
  const complaintComparison = toChartData(data?.complaint_comparison ?? []);

  return (
    <div className="space-y-5">
      {/* 스코어카드 4개 */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {ICONS.map(({ icon, color }, i) => (
          <ScoreCard
            key={i}
            title={scorecards[i]?.label ?? "—"}
            value={scorecards[i]?.value ?? null}
            unit={scorecards[i]?.unit ?? ""}
            icon={icon}
            iconColor={color}
            loading={isLoading}
          />
        ))}
      </div>

      {/* 차트 2×2 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* 참여율 추이 */}
        <ChartCard title="참여율 추이 (%)" period={period} onPeriodChange={setPeriod}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={participationTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="g-p-base" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g-p-filter" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="기준값" stroke="#7c3aed" strokeWidth={2} fill="url(#g-p-base)" dot={false} connectNulls />
              <Area type="monotone" dataKey="필터값" stroke="#a78bfa" strokeWidth={2} fill="url(#g-p-filter)" strokeDasharray="4 2" dot={false} connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* NPS 추이 */}
        <ChartCard title="NPS 추이 (점)" period={period} onPeriodChange={setPeriod}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={npsTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="g-n-base" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g-n-filter" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="기준값" stroke="#2563eb" strokeWidth={2} fill="url(#g-n-base)" dot={false} connectNulls />
              <Area type="monotone" dataKey="필터값" stroke="#60a5fa" strokeWidth={2} fill="url(#g-n-filter)" strokeDasharray="4 2" dot={false} connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 칭찬 비교 */}
        <ChartCard title="칭찬현황 비교 (건)" period={period} onPeriodChange={setPeriod}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={praiseComparison} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="기준값" fill="#7c3aed" radius={[4, 4, 0, 0]} maxBarSize={24} />
              <Bar dataKey="필터값" fill="#c4b5fd" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 불만 비교 */}
        <ChartCard title="불만현황 비교 (건)" period={period} onPeriodChange={setPeriod}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={complaintComparison} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="기준값" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={24} />
              <Bar dataKey="필터값" fill="#fca5a5" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
