interface CoverageBadgeProps {
  pct: number;
}

export default function CoverageBadge({ pct }: CoverageBadgeProps) {
  const colorClass =
    pct < 30
      ? 'bg-red-500 text-white'
      : pct <= 70
        ? 'bg-yellow-400 text-gray-900'
        : 'bg-green-500 text-white';

  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${colorClass}`}>
      {pct.toFixed(1)}%
    </span>
  );
}
