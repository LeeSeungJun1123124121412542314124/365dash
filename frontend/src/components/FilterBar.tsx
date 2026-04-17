import { useGroups, useBranches } from "../api/hooks";

export interface FilterValue {
  groupId: number | null;
  branchId: number | null;
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
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

const NPS_LEVEL_OPTIONS = ["매우만족", "만족", "보통이하"];
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

  // 시작/끝 연월 변경 시 역전 방지
  function handleStartYear(e: React.ChangeEvent<HTMLSelectElement>) {
    const sy = Number(e.target.value);
    const newEnd = (sy > value.endYear || (sy === value.endYear && value.startMonth > value.endMonth))
      ? { endYear: sy, endMonth: value.startMonth }
      : {};
    onChange({ ...value, startYear: sy, ...newEnd });
  }

  function handleStartMonth(e: React.ChangeEvent<HTMLSelectElement>) {
    const sm = Number(e.target.value);
    const newEnd = (value.startYear > value.endYear || (value.startYear === value.endYear && sm > value.endMonth))
      ? { endYear: value.startYear, endMonth: sm }
      : {};
    onChange({ ...value, startMonth: sm, ...newEnd });
  }

  function handleEndYear(e: React.ChangeEvent<HTMLSelectElement>) {
    const ey = Number(e.target.value);
    const newStart = (ey < value.startYear || (ey === value.startYear && value.endMonth < value.startMonth))
      ? { startYear: ey, startMonth: value.endMonth }
      : {};
    onChange({ ...value, endYear: ey, ...newStart });
  }

  function handleEndMonth(e: React.ChangeEvent<HTMLSelectElement>) {
    const em = Number(e.target.value);
    const newStart = (value.endYear < value.startYear || (value.endYear === value.startYear && em < value.startMonth))
      ? { startYear: value.endYear, startMonth: em }
      : {};
    onChange({ ...value, endMonth: em, ...newStart });
  }

  const selectCls = "text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-violet-200 bg-white";

  return (
    <div className="card px-4 py-3 flex flex-wrap items-center gap-3">
      {showPeriod && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-medium whitespace-nowrap">기간</label>
          <div className="flex items-center gap-1.5">
            <select value={value.startYear} onChange={handleStartYear} className={selectCls}>
              {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}년</option>)}
            </select>
            <select value={value.startMonth} onChange={handleStartMonth} className={selectCls}>
              {MONTH_OPTIONS.map((m) => <option key={m} value={m}>{m}월</option>)}
            </select>
            <span className="text-xs text-gray-400">~</span>
            <select value={value.endYear} onChange={handleEndYear} className={selectCls}>
              {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}년</option>)}
            </select>
            <select value={value.endMonth} onChange={handleEndMonth} className={selectCls}>
              {MONTH_OPTIONS.map((m) => <option key={m} value={m}>{m}월</option>)}
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
            className={selectCls}
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
            className={selectCls}
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
            className={selectCls}
          >
            {NPS_LEVEL_OPTIONS.map((n) => <option key={n}>{n}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}
