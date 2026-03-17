interface MetricCardProps {
  title: string;
  value: string;
  hint: string;
  accentClass: string;
}

export function MetricCard({ title, value, hint, accentClass }: MetricCardProps) {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
      <p className={`text-4xl font-bold ${accentClass}`}>{value}</p>
      <p className="text-gray-500 text-sm">{hint}</p>
    </div>
  );
}
