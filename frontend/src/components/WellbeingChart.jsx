import { useState } from 'react';

// Lightweight, dependency-free line chart rendered as SVG.
// Replaces recharts so the dev server has no bare-import to resolve.
export default function WellbeingChart({ data }) {
  const [hover, setHover] = useState(null);

  const width = 640;
  const height = 240;
  const padX = 44;
  const padTop = 12;
  const padBottom = 28;
  const yMin = 0;
  const yMax = 100;

  const innerW = width - padX - 12;
  const innerH = height - padTop - padBottom;

  if (!data.length) return null;

  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;
  const xFor = (i) => padX + i * stepX;
  const yFor = (v) => padTop + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

  const points = data.map((d, i) => ({ x: xFor(i), y: yFor(d.score), d }));
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const areaPath =
    `${path} L ${points[points.length - 1].x.toFixed(1)} ${(padTop + innerH).toFixed(1)} ` +
    `L ${points[0].x.toFixed(1)} ${(padTop + innerH).toFixed(1)} Z`;

  const yTicks = [0, 25, 50, 75, 100];

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-64"
        role="img"
        aria-label="Line chart of wellbeing check-in scores over time"
      >
        <defs>
          <linearGradient id="wb-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d9488" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#0d9488" stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((t) => {
          const y = yFor(t);
          return (
            <g key={t}>
              <line
                x1={padX}
                y1={y}
                x2={width - 12}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="3 3"
              />
              <text
                x={padX - 8}
                y={y + 3}
                textAnchor="end"
                fontSize="11"
                fill="#94a3b8"
              >
                {t}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => (
          <text
            key={d.date}
            x={xFor(i)}
            y={height - 8}
            textAnchor="middle"
            fontSize="11"
            fill="#94a3b8"
          >
            {d.date.slice(5)}
          </text>
        ))}

        <path d={areaPath} fill="url(#wb-area)" />
        <path
          d={path}
          fill="none"
          stroke="#0d9488"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hover === i ? 6 : 4}
              fill="#0d9488"
              stroke="#fff"
              strokeWidth={1.5}
              className="cursor-pointer transition-all"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          </g>
        ))}

        {hover !== null && (
          <g>
            <rect
              x={points[hover].x - 42}
              y={points[hover].y - 38}
              width={84}
              height={26}
              rx={8}
              fill="#0f172a"
              opacity={0.9}
            />
            <text
              x={points[hover].x}
              y={points[hover].y - 21}
              textAnchor="middle"
              fontSize="12"
              fill="#fff"
            >
              {data[hover].date}: {data[hover].score}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
