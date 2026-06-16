type MetricCardProps = {
  label: string;
  value: string;
  tone?: 'success' | 'warning' | 'danger' | 'neutral';
};

const toneMap = {
  success: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-200 border-amber-500/20',
  danger: 'bg-rose-500/10 text-rose-200 border-rose-500/20',
  neutral: 'bg-slate-700/70 text-slate-200 border-slate-600',
};

export default function MetricCard({ label, value, tone = 'neutral' }: MetricCardProps) {
  return (
    <div className={`rounded-3xl border px-5 py-4 shadow-panel ${toneMap[tone]}`}>
      <p className="text-sm uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}
