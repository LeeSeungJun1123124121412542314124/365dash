import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp } from "lucide-react";
import ScoreCard from "../components/ScoreCard";
import FilterBar from "../components/FilterBar";
import PeriodSelector from "../components/PeriodSelector";

const MOCK_DATA = [
  { month: "10월", 필터값: 62, 기준값: 65 },
  { month: "11월", 필터값: 67, 기준값: 66 },
  { month: "12월", 필터값: 64, 기준값: 67 },
  { month: "1월",  필터값: 70, 기준값: 68 },
  { month: "2월",  필터값: 73, 기준값: 70 },
  { month: "3월",  필터값: 76, 기준값: 72 },
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
          {p.name}: <span className="font-bold">{p.value}점</span>
        </p>
      ))}
    </div>
  );
}

export default function NpsPage() {
  const [period, setPeriod] = useState("6m");
  const [showBaseline, setShowBaseline] = useState(true);

  return (
    <div className="space-y-5">
      <FilterBar showNpsLevel />

      {/* 스코어카드 */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <ScoreCard title="매우만족" value="320" unit="건"  change={5.2}  icon={TrendingUp} iconColor="bg-green-100" />
        <ScoreCard title="만족"     value="480" unit="건"  change={1.8}  icon={TrendingUp} iconColor="bg-blue-100" />
        <ScoreCard title="보통이하" value="124" unit="건"  change={-8.3} icon={TrendingUp} iconColor="bg-red-100" />
        <ScoreCard title="이번 달 NPS" value="76" unit="점" change={3.1} icon={TrendingUp} iconColor="bg-violet-100" />
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
            <PeriodSelector options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={MOCK_DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
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
            <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} domain={[50, 90]} unit="점" />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            {showBaseline && (
              <Area type="monotone" dataKey="기준값" stroke="#2563eb" strokeWidth={2.5} fill="url(#grad-nps-base)" dot={false} activeDot={{ r: 5 }} />
            )}
            <Area type="monotone" dataKey="필터값" stroke="#60a5fa" strokeWidth={2.5} fill="url(#grad-nps-filter)" strokeDasharray="5 3" dot={false} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
