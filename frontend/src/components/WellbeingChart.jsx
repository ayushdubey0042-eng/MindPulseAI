import { useState } from 'react';

const BAND_META = [
  { key: 'low', label: 'Low (likely well)', start: 10, end: 15, color: 'rgba(16, 185, 129, 0.10)' },
  { key: 'moderate', label: 'Moderate distress', start: 16, end: 21, color: 'rgba(59, 130, 246, 0.10)' },
  { key: 'high', label: 'High distress', start: 22, end: 29, color: 'rgba(250, 204, 21, 0.12)' },
  { key: 'very_high', label: 'Very high distress', start: 30, end: 50, color: 'rgba(251, 146, 60, 0.12)' },
];

function bandFor(score) {
  if (score <= 15) return 'low';
  if (score <= 21) return 'moderate';
  if (score <= 29) return 'high';
  return 'very_high';
}

export default function WellbeingChart({ data }) {
  const [hover, setHover] = useState(null);

  const width = 640;
  const height = 260;
  const padX = 44;
  const padTop = 16;
  const padBottom = 32;
  const yMin = 10;
  const yMax = 50;

  const innerW = width - padX - 10;
  const innerH = height - padTop - padBottom;

  if (!data.length) return null;

  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;
  const xFor = (i) => padX + i * stepX;
  const yFor = (v) => padTop + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

  const points = data.map((d, i) => ({ x: xFor(i), y: yFor(d.score), d }));
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const yTicks = [10, 20, 30, 40, 50];

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full" role="img" aria-label="K10 distress chart over time">
        <defs>
          <linearGradient id="wb-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d9488" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#0d9488" stopOpacity="0" />
          </linearGradient>
        </defs>

        {BAND_META.map((band) => {
          const yStart = yFor(band.start);
          const yEnd = yFor(band.end);
          const rectY = Math.min(yStart, yEnd);
          const rectH = Math.abs(yEnd - yStart);
          return (
            <g key={band.key}>
              <rect x={padX} y={rectY} width={innerW} height={rectH} fill={band.color} />
              <text
                x={width - 10}
                y={rectY + 12}
                textAnchor="end"
                fontSize="10"
                fill="#64748b"
              >
                {band.label}
              </text>
            </g>
          );
        })}

        {yTicks.map((t) => {
          const y = yFor(t);
          return (
            <g key={t}>
              <line x1={padX} y1={y} x2={width - 12} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
              <text x={padX - 8} y={y + 3} textAnchor="end" fontSize="11" fill="#94a3b8">
                {t}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => (
          <text key={`${d.created_at || d.date}-${i}`} x={xFor(i)} y={height - 8} textAnchor="middle" fontSize="11" fill="#94a3b8">
            {d.date.slice(5)}
          </text>
        ))}

        <path d={`M ${points[0].x.toFixed(1)} ${yFor(50)} L ${points[points.length - 1].x.toFixed(1)} ${yFor(50)}`} fill="none" stroke="transparent" />
        <path d={path} fill="none" stroke="#0d9488" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />

        {points.map((p, i) => (
          <g key={`${p.d.created_at || p.d.date}-${i}`}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hover === i ? 6 : 4}
              fill="#0d9488"
              stroke="#fff"
              strokeWidth={1.5}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              className="cursor-pointer transition-all"
            />
          </g>
        ))}

        {hover !== null && (
          <g>
            <rect
              x={points[hover].x - 46}
              y={points[hover].y - 42}
              width={92}
              height={28}
              rx={8}
              fill="#0f172a"
              opacity={0.9}
            />
            <text x={points[hover].x} y={points[hover].y - 23} textAnchor="middle" fontSize="12" fill="#fff">
              {data[hover].score} · {bandFor(data[hover].score)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
