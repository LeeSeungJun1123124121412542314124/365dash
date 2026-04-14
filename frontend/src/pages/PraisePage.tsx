import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { Star } from "lucide-react";
import ScoreCard from "../components/ScoreCard";
import FilterBar from "../components/FilterBar";
import PeriodSelector from "../components/PeriodSelector";

const MOCK_DATA = [
  { month: "10월", 기준값: 48, 필터값: 42 },
  { month: "11월", 기준값: 55, 필터값: 50 },
  { month: "12월", 기준값: 52, 필터값: 47 },
  { month: "1월",  기준값: 61, 필터값: 55 },
  { month: "2월",  기준값: 67, 필터값: 60 },
  { month: "3월",  기준값: 70, 필터값: 65 },
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
          {p.name}: <span className="font-bold">{p.value}건</span>
        </p>
      ))}
    </div>
  );
}

export default function PraisePage() {
  const [period, setPeriod] = useState("6m");
  const [showBaseline, setShowBaseline] = useState(true);

  return (
    <div className="space-y-5">
      <FilterBar />

      {/* 스코어카드 */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <ScoreCard title="기준값 칭찬총계" value="353" unit="건" change={4.5}  icon={Star} iconColor="bg-amber-100" />
        <ScoreCard title="필터값 칭찬총계" value="319" unit="건" change={2.8}  icon={Star} iconColor="bg-yellow-100" />
        <ScoreCard title="수술 칭찬"       value="98"  unit="건" change={6.1}  icon={Star} iconColor="bg-orange-100" />
        <ScoreCard title="람스+시술 칭찬"  value="141" unit="건" change={-1.2} icon={Star} iconColor="bg-red-50" />
      </div>

      {/* 칭찬 비교 차트 */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-700">칭찬현황 비교</h3>
            <p className="text-xs text-gray-400 mt-0.5">기준값 vs 필터값 클러스터 막대</p>
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
          <BarChart data={MOCK_DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barGap={4} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} unit="건" />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            {showBaseline && (
              <Bar dataKey="기준값" fill="#7c3aed" radius={[5, 5, 0, 0]} maxBarSize={30} />
            )}
            <Bar dataKey="필터값" fill="#c4b5fd" radius={[5, 5, 0, 0]} maxBarSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
