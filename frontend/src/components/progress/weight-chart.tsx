"use client";

import { WeightLog } from "@/types";

export function WeightChart({ logs, height = 180 }: { logs: WeightLog[]; height?: number }) {
  if (logs.length < 2) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl border border-dashed border-white/15 text-sm text-white/40"
        style={{ height }}
      >
        Log your weight on two or more days to see a trend
      </div>
    );
  }

  const width = 320;
  const padding = 24;
  const weights = logs.map((l) => l.weightKg);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;

  const points = logs.map((log, i) => {
    const x = padding + (i / (logs.length - 1)) * (width - padding * 2);
    const y = height - padding - ((log.weightKg - min) / range) * (height - padding * 2);
    return { x, y, log };
  });

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${path} L${points[points.length - 1].x.toFixed(1)},${height - padding} L${points[0].x.toFixed(1)},${height - padding} Z`;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" className="min-w-[320px]">
        <defs>
          <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a3e635" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#a3e635" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#weightFill)" />
        <path d={path} fill="none" stroke="#a3e635" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 4 : 2.5} fill="#65a30d" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-white/40">
        <span>{formatShort(logs[0].logDate)}</span>
        <span>{formatShort(logs[logs.length - 1].logDate)}</span>
      </div>
    </div>
  );
}

function formatShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
