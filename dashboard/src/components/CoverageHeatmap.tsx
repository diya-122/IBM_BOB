import { Treemap, ResponsiveContainer } from 'recharts';

interface TreemapItem {
  name: string;
  size: number;
  pct: number;
  filePath?: string;
}

interface CoverageHeatmapProps {
  data: TreemapItem[];
  onSelect?: (name: string) => void;
}

function colorForPct(pct: number): string {
  if (pct < 30) return '#ef4444';
  if (pct <= 70) return '#f59e0b';
  return '#22c55e';
}

interface ContentProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  pct?: number;
  root?: boolean;
  depth?: number;
}

function CustomContent(props: ContentProps) {
  const { x = 0, y = 0, width = 0, height = 0, name = '', pct = 0, depth = 0 } = props;
  if (depth === 0 || width < 20 || height < 20) return null;

  const fill = colorForPct(pct);
  const labelVisible = width > 60 && height > 30;
  const shortName = name.split('/').pop() ?? name;

  return (
    <g>
      <rect
        x={x + 1}
        y={y + 1}
        width={width - 2}
        height={height - 2}
        style={{ fill, stroke: '#fff', strokeWidth: 2, cursor: 'pointer' }}
      />
      {labelVisible && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 6}
            textAnchor="middle"
            fill="#fff"
            fontSize={11}
            fontWeight={600}
            style={{ pointerEvents: 'none' }}
          >
            {shortName}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            fill="#fff"
            fontSize={10}
            style={{ pointerEvents: 'none' }}
          >
            {pct.toFixed(1)}%
          </text>
        </>
      )}
    </g>
  );
}

export default function CoverageHeatmap({ data, onSelect }: CoverageHeatmapProps) {
  const handleClick = (item: TreemapItem) => {
    if (onSelect) {
      onSelect(item.filePath ?? item.name);
    }
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <Treemap
        data={data}
        dataKey="size"
        content={<CustomContent />}
        onClick={(item: unknown) => handleClick(item as TreemapItem)}
      />
    </ResponsiveContainer>
  );
}
