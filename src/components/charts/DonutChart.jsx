import { useId } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { shade } from "../../utils/color";

// Circular stock chart with a 3D look (glossy gradient slices + drop shadow).
// Pass innerRadius={0} to render a full pie instead of a donut.
export default function DonutChart({
  data,
  height = 260,
  innerRadius = "62%",
  centerValue,
  centerLabel = "units",
  unit = "units",
  showLegend = false,
  showTooltip = false,
  light = false,
}) {
  const uid = useId().replace(/:/g, "");
  const total = data.reduce((s, d) => s + d.value, 0);
  const isDonut = innerRadius !== 0 && innerRadius !== "0";
  return (
    <div style={{ height }} className="relative w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <defs>
            <filter id={`shadow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#0f172a" floodOpacity="0.28" />
            </filter>
            {data.map((d, i) => (
              <radialGradient key={i} id={`grad-${uid}-${i}`} cx="38%" cy="34%" r="78%">
                <stop offset="0%" stopColor={shade(d.color, 0.34)} />
                <stop offset="55%" stopColor={d.color} />
                <stop offset="100%" stopColor={shade(d.color, -0.2)} />
              </radialGradient>
            ))}
          </defs>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={innerRadius}
            outerRadius="98%"
            paddingAngle={2}
            stroke="rgba(255,255,255,0.65)"
            strokeWidth={1}
            isAnimationActive
            animationDuration={700}
            style={{ filter: `url(#shadow-${uid})` }}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={`url(#grad-${uid}-${i})`} />
            ))}
          </Pie>
          {showTooltip && (
            <Tooltip
              formatter={(v, n) => [`${v} ${unit}`, n]}
              contentStyle={{
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                boxShadow: "0 8px 24px rgba(16,24,40,.12)",
                fontSize: 12,
                padding: "4px 10px",
              }}
            />
          )}
          {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />}
        </PieChart>
      </ResponsiveContainer>
      {isDonut && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span
            className={`text-2xl font-bold ${light ? "text-white" : "text-slate-800"}`}
          >
            {centerValue ?? total}
          </span>
          <span
            className={`text-[11px] font-semibold uppercase tracking-wide ${
              light ? "text-white/70" : "text-slate-400"
            }`}
          >
            {centerLabel}
          </span>
        </div>
      )}
    </div>
  );
}
