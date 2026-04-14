/**
 * 공통 필터 바 — 대분류 / 중분류 / 기간 셀렉트
 */
interface FilterBarProps {
  showGroup?: boolean;
  showBranch?: boolean;
  showPeriod?: boolean;
  showNpsLevel?: boolean;
}

const GROUP_OPTIONS = ["전체", "병원급", "람스+시술", "람스"];
const BRANCH_OPTIONS: Record<string, string[]> = {
  "전체":     ["전체"],
  "병원급":  ["전체", "서울병원", "대전병원", "부산병원", "인천병원", "대구병원"],
  "람스+시술": ["전체", "강남본점", "노원", "분당", "성신여대", "수원", "신촌", "영등포", "일산", "천호"],
  "람스":    ["전체", "부천", "안양평촌", "천안", "청주", "해운대"],
};
const NPS_LEVEL_OPTIONS = ["전체", "매우만족", "만족", "보통이하"];

export default function FilterBar({
  showGroup = true,
  showBranch = true,
  showPeriod = true,
  showNpsLevel = false,
}: FilterBarProps) {
  return (
    <div className="card px-4 py-3 flex flex-wrap items-center gap-3 mb-5">
      {showPeriod && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-medium whitespace-nowrap">기간</label>
          <div className="flex gap-1.5">
            <select className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-violet-200 bg-white">
              {Array.from({ length: 5 }, (_, i) => 2022 + i).map((y) => (
                <option key={y}>{y}년</option>
              ))}
            </select>
            <select className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-violet-200 bg-white">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m}>{m}월</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {showGroup && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-medium">대분류</label>
          <select className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-violet-200 bg-white">
            {GROUP_OPTIONS.map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>
      )}

      {showBranch && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-medium">중분류</label>
          <select className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-violet-200 bg-white">
            {BRANCH_OPTIONS["전체"].map((b) => <option key={b}>{b}</option>)}
          </select>
        </div>
      )}

      {showNpsLevel && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-medium">NPS 선택</label>
          <select className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-violet-200 bg-white">
            {NPS_LEVEL_OPTIONS.map((n) => <option key={n}>{n}</option>)}
          </select>
        </div>
      )}

      <button className="ml-auto px-4 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors">
        조회
      </button>
    </div>
  );
}
