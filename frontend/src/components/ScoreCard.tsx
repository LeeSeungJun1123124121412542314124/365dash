import { type LucideIcon } from "lucide-react";

interface Props {
  title: string;
  value: string | number | null;
  unit?: string;
  change?: number;        // % 증감 (양수=상승, 음수=하락)
  changeLabel?: string;   // "전월 대비" 등
  icon?: LucideIcon;
  iconColor?: string;     // 테일윈드 배경색 클래스
  loading?: boolean;
}

export default function ScoreCard({
  title, value, unit = "", change, changeLabel = "전월 대비",
  icon: Icon, iconColor = "bg-violet-100", loading = false,
}: Props) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <span className="text-sm text-gray-500 font-medium">{title}</span>
        {Icon && (
          <span className={`w-9 h-9 rounded-xl ${iconColor} flex items-center justify-center`}>
            <Icon size={18} className="text-violet-600" />
          </span>
        )}
      </div>

      {loading ? (
        <div className="h-8 w-28 bg-gray-100 rounded-lg animate-pulse" />
      ) : (
        <div className="flex items-end gap-1">
          <span className="text-2xl font-bold text-gray-800 leading-none">
            {value ?? "—"}
          </span>
          {unit && <span className="text-sm text-gray-400 mb-0.5">{unit}</span>}
        </div>
      )}

      {change !== undefined && (
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md ${
              isPositive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
            }`}
          >
            {isPositive ? "▲" : "▼"} {Math.abs(change)}%
          </span>
          <span className="text-xs text-gray-400">{changeLabel}</span>
        </div>
      )}
    </div>
  );
}
