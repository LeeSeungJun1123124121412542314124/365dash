interface Props {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}

export default function PeriodSelector({ options, value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`period-btn ${value === opt.value ? "period-btn-active" : "period-btn-inactive"}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
