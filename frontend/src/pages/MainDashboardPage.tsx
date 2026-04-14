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
import { periodToMonths } from "../lib/chartUtils";

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

export default function MainDashboardPage() {
  const [period, setPeriod] = useState("6m");
  const months = periodToMonths(period);
  const { data, isLoading } = useDashboardMain(months);

  const scorecard = data?.scorecard ?? {};
  const charts = data?.charts ?? {};

  // 단순 트렌드 (단일 시리즈) — 메인 대시보드는 전체 평균만 표시
  const participationTrend = (charts.participation_trend ?? []).map((p: any) => ({
    month: p.label, 참여율: p.rate,
  }));
  const npsTrend = (charts.nps_trend ?? []).map((p: any) => ({
    month: p.label, 매우만족: p.very_satisfied_pct,
  }));
  const praiseTrend = (charts.praise_trend ?? []).map((p: any) => ({
    month: p.label, 건수: p.count,
  }));
  const complaintTrend = (charts.complaint_trend ?? []).map((p: any) => ({
    month: p.label, 건수: p.count,
  }));

  const SCORE_ITEMS = [
    { icon: Users,      color: "bg-violet-100", title: "평균 참여율",    value: scorecard.participation_rate_avg,   unit: "%" },
    { icon: TrendingUp, color: "bg-blue-100",   title: "NPS 매우만족율", value: scorecard.nps_very_satisfied_pct,  unit: "%" },
    { icon: Star,       color: "bg-amber-100",  title: "평균 칭찬건수",  value: scorecard.praise_count_avg,        unit: "건" },
    { icon: ThumbsDown, color: "bg-red-100",    title: "평균 불만건수",  value: scorecard.complaint_count_avg,     unit: "건" },
  ];

  return (
    <div className="space-y-5">
      {/* 스코어카드 4개 */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {SCORE_ITEMS.map(({ icon, color, title, value, unit }) => (
          <ScoreCard
            key={title}
            title={title}
            value={value ?? null}
            unit={unit}
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
                <linearGradient id="g-p" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="참여율" stroke="#7c3aed" strokeWidth={2} fill="url(#g-p)" dot={false} connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* NPS 추이 */}
        <ChartCard title="NPS 매우만족율 추이 (%)" period={period} onPeriodChange={setPeriod}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={npsTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="g-n" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="매우만족" stroke="#2563eb" strokeWidth={2} fill="url(#g-n)" dot={false} connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 칭찬 추이 */}
        <ChartCard title="칭찬현황 추이 (건)" period={period} onPeriodChange={setPeriod}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={praiseTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="건수" fill="#7c3aed" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 불만 추이 */}
        <ChartCard title="불만현황 추이 (건)" period={period} onPeriodChange={setPeriod}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={complaintTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="건수" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
