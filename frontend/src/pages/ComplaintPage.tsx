import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { ThumbsDown } from "lucide-react";
import ScoreCard from "../components/ScoreCard";
import FilterBar from "../components/FilterBar";
import PeriodSelector from "../components/PeriodSelector";

const OVERVIEW_DATA = [
  { month: "10월", 기준값: 22, 필터값: 18 },
  { month: "11월", 기준값: 19, 필터값: 15 },
  { month: "12월", 기준값: 24, 필터값: 20 },
  { month: "1월",  기준값: 17, 필터값: 13 },
  { month: "2월",  기준값: 15, 필터값: 11 },
  { month: "3월",  기준값: 14, 필터값: 10 },
];

// 불만 키워드 목 데이터
const KEYWORD_DATA = [
  { 연도: 2025, 월: 3, 지점명: "강남본점",  주차: 3, "안내·응대부족": 1, 대기관련: 2, 불친절: 0, 시스템불만: 1, 개인정보: 0, 환경불만: 1, 기타: 2 },
  { 연도: 2025, 월: 3, 지점명: "서울병원",  주차: 1, "안내·응대부족": 3, 대기관련: 1, 불친절: 2, 시스템불만: 0, 개인정보: 1, 환경불만: 0, 기타: 1 },
  { 연도: 2025, 월: 3, 지점명: "노원",      주차: 0, "안내·응대부족": 2, 대기관련: 3, 불친절: 1, 시스템불만: 2, 개인정보: 0, 환경불만: 1, 기타: 0 },
  { 연도: 2025, 월: 3, 지점명: "분당",      주차: 2, "안내·응대부족": 0, 대기관련: 1, 불친절: 0, 시스템불만: 3, 개인정보: 1, 환경불만: 2, 기타: 1 },
  { 연도: 2025, 월: 3, 지점명: "수원",      주차: 1, "안내·응대부족": 1, 대기관련: 0, 불친절: 2, 시스템불만: 1, 개인정보: 0, 환경불만: 0, 기타: 3 },
];

const KEYWORD_COLS = ["주차", "안내·응대부족", "대기관련", "불친절", "시스템불만", "개인정보", "환경불만", "기타"] as const;

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

export default function ComplaintPage() {
  const [tab, setTab] = useState<"overview" | "keywords">("overview");
  const [period, setPeriod] = useState("6m");
  const [showBaseline, setShowBaseline] = useState(true);

  return (
    <div className="space-y-5">
      {/* 탭 */}
      <div className="flex gap-1 bg-white rounded-2xl p-1 shadow-sm w-fit">
        {(["overview", "keywords"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === t
                ? "bg-violet-600 text-white shadow"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "overview" ? "불만 현황" : "키워드"}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <FilterBar />

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <ScoreCard title="기준값 불만총계" value="111" unit="건" change={-5.2} icon={ThumbsDown} iconColor="bg-red-100" />
            <ScoreCard title="필터값 불만총계" value="87"  unit="건" change={-9.4} icon={ThumbsDown} iconColor="bg-orange-100" />
            <ScoreCard title="수술 불만"       value="28"  unit="건" change={2.1}  icon={ThumbsDown} iconColor="bg-amber-100" />
            <ScoreCard title="람스+시술 불만"  value="39"  unit="건" change={-14}  icon={ThumbsDown} iconColor="bg-yellow-50" />
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-700">불만현황 비교</h3>
                <p className="text-xs text-gray-400 mt-0.5">기준값 vs 필터값 클러스터 막대</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBaseline((v) => !v)}
                  className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
                    showBaseline
                      ? "border-red-300 text-red-500 bg-red-50"
                      : "border-gray-200 text-gray-400"
                  }`}
                >
                  기준값 {showBaseline ? "숨기기" : "표시"}
                </button>
                <PeriodSelector options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={OVERVIEW_DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barGap={4} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} unit="건" />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                {showBaseline && (
                  <Bar dataKey="기준값" fill="#ef4444" radius={[5, 5, 0, 0]} maxBarSize={30} />
                )}
                <Bar dataKey="필터값" fill="#fca5a5" radius={[5, 5, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {tab === "keywords" && (
        <>
          <FilterBar showNpsLevel={false} />

          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-700">불만 키워드 현황</h3>
              <p className="text-xs text-gray-400 mt-0.5">8개 카테고리별 건수</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">연도</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">월</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">지점명</th>
                    {KEYWORD_COLS.map((col) => (
                      <th key={col} className="px-4 py-3 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {KEYWORD_DATA.map((row, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-violet-50/40 transition-colors">
                      <td className="px-4 py-3 text-gray-600">{row.연도}</td>
                      <td className="px-4 py-3 text-gray-600">{row.월}월</td>
                      <td className="px-4 py-3 font-medium text-gray-700">{row.지점명}</td>
                      {KEYWORD_COLS.map((col) => (
                        <td key={col} className="px-4 py-3 text-center">
                          {(row as any)[col] > 0 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs font-semibold">
                              {(row as any)[col]}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
