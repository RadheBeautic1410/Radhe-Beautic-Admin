"use client";

export const inr = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

export const num = (value: number) => new Intl.NumberFormat("en-IN").format(value || 0);

const compact = (value: number) =>
  new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(value);

type TrendPoint = { label: string; value: number; compare?: number };

/** Line chart of one value per day, with an optional dashed comparison line. */
export function TrendChart({ data, height = 200 }: { data: TrendPoint[]; height?: number }) {
  if (!data.length) return null;
  const width = 800;
  const pad = { top: 12, right: 12, bottom: 24, left: 48 };
  const max = Math.max(1, ...data.map((d) => Math.max(d.value, d.compare || 0)));
  const x = (i: number) =>
    pad.left + (data.length === 1 ? 0 : (i / (data.length - 1)) * (width - pad.left - pad.right));
  const y = (v: number) => pad.top + (1 - v / max) * (height - pad.top - pad.bottom);
  const line = (pick: (d: TrendPoint) => number) =>
    data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(pick(d))}`).join(" ");
  const hasCompare = data.some((d) => d.compare !== undefined);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img">
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line
            x1={pad.left}
            x2={width - pad.right}
            y1={y(max * t)}
            y2={y(max * t)}
            className="stroke-gray-200"
          />
          <text x={pad.left - 6} y={y(max * t) + 4} textAnchor="end" className="fill-gray-500 text-[11px]">
            {compact(max * t)}
          </text>
        </g>
      ))}
      {hasCompare && (
        <path
          d={line((d) => d.compare || 0)}
          fill="none"
          strokeDasharray="5 4"
          className="stroke-gray-400"
          strokeWidth={1.5}
        />
      )}
      <path d={line((d) => d.value)} fill="none" className="stroke-blue-600" strokeWidth={2} />
      {data.map((d, i) => (
        <circle key={i} cx={x(i)} cy={y(d.value)} r={data.length > 60 ? 1.5 : 3} className="fill-blue-600">
          <title>{`${d.label}: ${inr(d.value)}`}</title>
        </circle>
      ))}
      <text x={pad.left} y={height - 6} className="fill-gray-500 text-[11px]">
        {data[0].label}
      </text>
      <text x={width - pad.right} y={height - 6} textAnchor="end" className="fill-gray-500 text-[11px]">
        {data[data.length - 1].label}
      </text>
    </svg>
  );
}

type BarRow = { label: string; value: number; note?: string };

/** Horizontal bars, longest first as given. */
export function BarList({
  rows,
  format = inr,
  color = "bg-blue-500",
}: {
  rows: BarRow[];
  format?: (v: number) => string;
  color?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="text-sm text-gray-500">No data for this period.</p>;
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex justify-between text-sm">
            <span className="font-medium text-gray-700">{r.label}</span>
            <span className="text-gray-600">
              {format(r.value)}
              {r.note ? <span className="text-gray-400"> · {r.note}</span> : null}
            </span>
          </div>
          <div className="h-2 rounded bg-gray-100">
            <div
              className={`h-2 rounded ${color}`}
              style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
