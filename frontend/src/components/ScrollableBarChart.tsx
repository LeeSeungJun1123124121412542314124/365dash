import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

function CustomTooltip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value ?? "—"}{unit}</span>
        </p>
      ))}
    </div>
  );
}

interface Props {
  data: Array<{ month: string; 기준값: number | null; 필터값: number | null }>;
  filterLabel: string;
  baseColor: string;
  filterColor: string;
  chartType?: "bar" | "line";
  unit?: string;
}

export default function ScrollableBarChart({
  data,
  filterLabel,
  baseColor,
  filterColor,
  chartType = "bar",
  unit = "건",
}: Props) {
  const needScroll = data.length > 24;
  const chartWidth = needScroll ? data.length * 50 : undefined;

  const barChart = (w: any, h: number) => (
    <BarChart
      width={typeof w === "number" ? w : undefined}
      height={h}
      data={data}
      margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
      barGap={4}
      barCategoryGap="30%"
    >
      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} interval={0} />
      <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} unit={unit} />
      <Tooltip content={<CustomTooltip unit={unit} />} />
      <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
      <Bar dataKey="기준값" name="기준값(전체)" fill={baseColor} radius={[5, 5, 0, 0]} maxBarSize={30} />
      <Bar dataKey="필터값" name={`필터값(${filterLabel})`} fill={filterColor} radius={[5, 5, 0, 0]} maxBarSize={30} />
    </BarChart>
  );

  const lineChart = (w: any, h: number) => (
    <AreaChart
      width={typeof w === "number" ? w : undefined}
      height={h}
      data={data}
      margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
    >
      <defs>
        <linearGradient id={`grad-base-${baseColor}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={baseColor} stopOpacity={0.15} />
          <stop offset="95%" stopColor={baseColor} stopOpacity={0} />
        </linearGradient>
        <linearGradient id={`grad-filter-${filterColor}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={filterColor} stopOpacity={0.25} />
          <stop offset="95%" stopColor={filterColor} stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} interval={0} />
      <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} unit={unit} />
      <Tooltip content={<CustomTooltip unit={unit} />} />
      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
      <Area type="monotone" dataKey="기준값" name="기준값(전체)" stroke={baseColor} strokeWidth={2.5} fill={`url(#grad-base-${baseColor})`} dot={false} activeDot={{ r: 5 }} connectNulls />
      <Area type="monotone" dataKey="필터값" name={`필터값(${filterLabel})`} stroke={filterColor} strokeWidth={2.5} fill={`url(#grad-filter-${filterColor})`} strokeDasharray="5 3" dot={false} activeDot={{ r: 5 }} connectNulls />
    </AreaChart>
  );

  const render = chartType === "line" ? lineChart : barChart;

  if (needScroll) {
    return (
      <div className="overflow-x-auto">
        <div style={{ width: chartWidth, height: 260 }}>
          {render(chartWidth, 260)}
        </div>
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      {render("100%", 260)}
    </ResponsiveContainer>
  );
}
