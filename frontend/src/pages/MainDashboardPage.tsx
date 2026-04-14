import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, Star, ThumbsDown, Users } from "lucide-react";
import ScoreCard from "../components/ScoreCard";
import PeriodSelector from "../components/PeriodSelector";

// ── 목 데이터 ──────────────────────────────────────────────
const PARTICIPATION_DATA = [
  { month: "10월", 필터값: 68, 기준값: 72 },
  { month: "11월", 필터값: 74, 기준값: 75 },
  { month: "12월", 필터값: 71, 기준값: 73 },
  { month: "1월",  필터값: 78, 기준값: 76 },
  { month: "2월",  필터값: 82, 기준값: 79 },
  { month: "3월",  필터값: 85, 기준값: 80 },
];

const NPS_DATA = [
  { month: "10월", 필터값: 62, 기준값: 65 },
  { month: "11월", 필터값: 67, 기준값: 66 },
  { month: "12월", 필터값: 64, 기준값: 67 },
  { month: "1월",  필터값: 70, 기준값: 68 },
  { month: "2월",  필터값: 73, 기준값: 70 },
  { month: "3월",  필터값: 76, 기준값: 72 },
];

const PRAISE_DATA = [
  { month: "10월", 기준값: 48, 필터값: 42 },
  { month: "11월", 기준값: 55, 필터값: 50 },
  { month: "12월", 기준값: 52, 필터값: 47 },
  { month: "1월",  기준값: 61, 필터값: 55 },
  { month: "2월",  기준값: 67, 필터값: 60 },
  { month: "3월",  기준값: 70, 필터값: 65 },
];

const COMPLAINT_DATA = [
  { month: "10월", 기준값: 22, 필터값: 18 },
  { month: "11월", 기준값: 19, 필터값: 15 },
  { month: "12월", 기준값: 24, 필터값: 20 },
  { month: "1월",  기준값: 17, 필터값: 13 },
  { month: "2월",  기준값: 15, 필터값: 11 },
  { month: "3월",  기준값: 14, 필터값: 10 },
];

const PERIOD_OPTIONS = [
  { label: "3개월", value: "3m" },
  { label: "6개월", value: "6m" },
];

// ── 커스텀 툴팁 ─────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ── 차트 카드 래퍼 ────────────────────────────────────────────
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
        <PeriodSelector
          options={PERIOD_OPTIONS}
          value={period}
          onChange={onPeriodChange}
        />
      </div>
      {children}
    </div>
  );
}

// ── 메인 페이지 ────────────────────────────────────────────────
export default function MainDashboardPage() {
  const [period, setPeriod] = useState("6m");

  return (
    <div className="space-y-5">
      {/* 스코어카드 4개 */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <ScoreCard
          title="6개월 평균 참여율"
          value="76.3"
          unit="%"
          change={3.2}
          icon={Users}
          iconColor="bg-violet-100"
        />
        <ScoreCard
          title="6개월 평균 NPS"
          value="68.7"
          unit="점"
          change={1.8}
          icon={TrendingUp}
          iconColor="bg-blue-100"
        />
        <ScoreCard
          title="6개월 평균 칭찬"
          value="56"
          unit="건"
          change={4.5}
          icon={Star}
          iconColor="bg-amber-100"
        />
        <ScoreCard
          title="6개월 평균 불만"
          value="18"
          unit="건"
          change={-12.3}
          icon={ThumbsDown}
          iconColor="bg-red-100"
        />
      </div>

      {/* 차트 2×2 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* 참여율 추이 */}
        <ChartCard title="참여율 추이 (%)" period={period} onPeriodChange={setPeriod}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={PARTICIPATION_DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="grad-participation-base" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="grad-participation-filter" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} domain={[50, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="기준값" stroke="#7c3aed" strokeWidth={2} fill="url(#grad-participation-base)" dot={false} />
              <Area type="monotone" dataKey="필터값" stroke="#a78bfa" strokeWidth={2} fill="url(#grad-participation-filter)" strokeDasharray="4 2" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* NPS 추이 */}
        <ChartCard title="NPS 추이 (점)" period={period} onPeriodChange={setPeriod}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={NPS_DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="grad-nps-base" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="grad-nps-filter" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} domain={[50, 90]} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="기준값" stroke="#2563eb" strokeWidth={2} fill="url(#grad-nps-base)" dot={false} />
              <Area type="monotone" dataKey="필터값" stroke="#60a5fa" strokeWidth={2} fill="url(#grad-nps-filter)" strokeDasharray="4 2" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 칭찬 비교 */}
        <ChartCard title="칭찬현황 비교 (건)" period={period} onPeriodChange={setPeriod}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={PRAISE_DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barGap={2}>
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
            <BarChart data={COMPLAINT_DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barGap={2}>
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
