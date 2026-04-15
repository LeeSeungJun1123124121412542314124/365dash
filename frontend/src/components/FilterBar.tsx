import { useGroups, useBranches } from "../api/hooks";

export interface FilterValue {
  groupId: number | null;
  branchId: number | null;
  year: number;
  month: number;
}

interface FilterBarProps {
  value: FilterValue;
  onChange: (v: FilterValue) => void;
  showGroup?: boolean;
  showBranch?: boolean;
  showPeriod?: boolean;
  showNpsLevel?: boolean;
  npsLevel?: string;
  onNpsLevelChange?: (v: string) => void;
}

const NPS_LEVEL_OPTIONS = ["전체", "매우만족", "만족", "보통이하"];
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - i);
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function FilterBar({
  value,
  onChange,
  showGroup = true,
  showBranch = true,
  showPeriod = true,
  showNpsLevel = false,
  npsLevel = "전체",
  onNpsLevelChange,
}: FilterBarProps) {
  const { data: groups = [] } = useGroups();
  const { data: branches = [] } = useBranches(value.groupId);

  // 그룹 변경 시 지점 초기화
  function handleGroupChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value ? Number(e.target.value) : null;
    onChange({ ...value, groupId: id, branchId: null });
  }

  function handleBranchChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value ? Number(e.target.value) : null;
    onChange({ ...value, branchId: id });
  }

  return (
    <div className="card px-4 py-3 flex flex-wrap items-center gap-3">
      {showPeriod && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-medium whitespace-nowrap">기간</label>
          <div className="flex gap-1.5">
            <select
              value={value.year}
              onChange={(e) => onChange({ ...value, year: Number(e.target.value) })}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-violet-200 bg-white"
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>
            <select
              value={value.month}
              onChange={(e) => onChange({ ...value, month: Number(e.target.value) })}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-violet-200 bg-white"
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m} value={m}>{m}월</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {showGroup && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-medium">대분류</label>
          <select
            value={value.groupId ?? ""}
            onChange={handleGroupChange}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-violet-200 bg-white"
          >
            <option value="">전체</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      )}

      {showBranch && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-medium">중분류</label>
          <select
            value={value.branchId ?? ""}
            onChange={handleBranchChange}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-violet-200 bg-white"
          >
            <option value="">전체</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {showNpsLevel && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-medium">NPS 선택</label>
          <select
            value={npsLevel}
            onChange={(e) => onNpsLevelChange?.(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-violet-200 bg-white"
          >
            {NPS_LEVEL_OPTIONS.map((n) => <option key={n}>{n}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}
