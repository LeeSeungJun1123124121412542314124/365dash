import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { Users } from "lucide-react";
import ScoreCard from "../components/ScoreCard";
import FilterBar from "../components/FilterBar";
import PeriodSelector from "../components/PeriodSelector";

const MOCK_DATA = [
  { month: "10월", 필터값: 68, 기준값: 72 },
  { month: "11월", 필터값: 74, 기준값: 75 },
  { month: "12월", 필터값: 71, 기준값: 73 },
  { month: "1월",  필터값: 78, 기준값: 76 },
  { month: "2월",  필터값: 82, 기준값: 79 },
  { month: "3월",  필터값: 85, 기준값: 80 },
];

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
          {p.name}: <span className="font-bold">{p.value}%</span>
        </p>
      ))}
    </div>
  );
}

export default function ParticipationPage() {
  const [period, setPeriod] = useState("6m");

  return (
    <div className="space-y-5">
      <FilterBar />

      {/* 스코어카드 */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <ScoreCard title="이번 달 참여율" value="85.0" unit="%" change={3.2} icon={Users} iconColor="bg-violet-100" />
        <ScoreCard title="이번 달 참여자 수" value="1,240" unit="명" change={2.1} icon={Users} iconColor="bg-blue-100" />
        <ScoreCard title="6개월 평균 참여율" value="76.3" unit="%" change={1.8} icon={Users} iconColor="bg-indigo-100" />
      </div>

      {/* 참여율 추이 차트 */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-700">참여율 추이</h3>
            <p className="text-xs text-gray-400 mt-0.5">기준값(전체 평균) vs 필터값 비교</p>
          </div>
          <PeriodSelector options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={MOCK_DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
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
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} domain={[50, 100]} unit="%" />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="기준값" stroke="#7c3aed" strokeWidth={2.5} fill="url(#grad-p-base)" dot={false} activeDot={{ r: 5 }} />
            <Area type="monotone" dataKey="필터값" stroke="#a78bfa" strokeWidth={2.5} fill="url(#grad-p-filter)" strokeDasharray="5 3" dot={false} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
