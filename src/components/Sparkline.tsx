interface Props {
  values: number[]; // -1 = loss, +1 = win, 0 = no game
  width?: number;
  height?: number;
}

export function Sparkline({ values, width = 60, height = 18 }: Props) {
  if (values.length === 0) return null;
  const step = width / Math.max(values.length, 1);
  let cumulative = 0;
  const points = values.map((v, i) => {
    cumulative += v;
    return { x: i * step, y: cumulative };
  });
  const ys = points.map(p => p.y);
  const min = Math.min(...ys, 0);
  const max = Math.max(...ys, 0);
  const range = Math.max(1, max - min);
  const path = points.map((p, i) => {
    const yPx = height - ((p.y - min) / range) * (height - 2) - 1;
    return `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${yPx.toFixed(1)}`;
  }).join(" ");
  const lastY = points[points.length - 1].y;
  const trend = lastY > 0 ? "#34d399" : lastY < 0 ? "#f87171" : "#94a3b8";
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="inline-block align-middle">
      <path d={path} fill="none" stroke={trend} strokeWidth="1.5" />
      <circle cx={points[points.length - 1].x} cy={height - ((lastY - min) / range) * (height - 2) - 1} r="1.8" fill={trend} />
    </svg>
  );
}
