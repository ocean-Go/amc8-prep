interface MetricCardProps {
  title: string;
  value: string;
  hint: string;
  accentClass: string;
  loading?: boolean;
}

export function MetricCard({ title, value, hint, accentClass, loading = false }: MetricCardProps) {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
      {loading ? (
        <div className="h-10 w-24 bg-gray-200 rounded animate-pulse mb-2" />
      ) : (
        <p className={`text-4xl font-bold ${accentClass}`}>{value}</p>
      )}
      {loading ? (
        <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
      ) : (
        <p className="text-gray-500 text-sm">{hint}</p>
      )}
    </div>
  );
}
