interface ProgressItem {
  module: string;
  status: 'complete' | 'running' | 'pending';
  testsGenerated: number;
  timeMs: number;
}

interface ProgressTrackerProps {
  items: ProgressItem[];
}

function StatusIcon({ status }: { status: ProgressItem['status'] }) {
  if (status === 'complete') {
    return <span className="text-green-500 text-base font-bold">✓</span>;
  }
  if (status === 'running') {
    return <span className="text-blue-500 text-base animate-spin inline-block">⟳</span>;
  }
  return <span className="text-gray-400 text-base">○</span>;
}

function statusLabel(status: ProgressItem['status']): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusColor(status: ProgressItem['status']): string {
  if (status === 'complete') return 'text-green-600';
  if (status === 'running')  return 'text-blue-600';
  return 'text-gray-400';
}

export default function ProgressTracker({ items }: ProgressTrackerProps) {
  return (
    <ul className="divide-y divide-gray-100">
      {items.map((item) => (
        <li key={item.module} className="flex items-center gap-4 py-3">
          <StatusIcon status={item.status} />
          <span className="font-mono text-xs text-gray-700 flex-1 truncate">{item.module}</span>
          <span className={`text-xs font-medium w-16 text-right ${statusColor(item.status)}`}>
            {statusLabel(item.status)}
          </span>
          <span className="text-xs text-gray-500 w-20 text-right">
            {item.testsGenerated > 0 ? `${item.testsGenerated} tests` : '—'}
          </span>
          <span className="text-xs text-gray-400 w-20 text-right">
            {item.timeMs > 0 ? `${item.timeMs} ms` : '—'}
          </span>
        </li>
      ))}
    </ul>
  );
}
