import { useId } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { shade } from "../../utils/color";

// Vertical bar chart (categories on X-axis, quantity on Y-axis) with a 3D look
// (glossy gradient bars + drop shadow). `data` items: { name, value, color }.
export default function CategoryBarChart({
  data,
  height = 260,
  unit = "units",
  fallback = "#0098d8",
}) {
  const uid = useId().replace(/:/g, "");
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 28 }}>
          <defs>
            <filter id={`bshadow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.25" />
            </filter>
            {data.map((d, i) => {
              const c = d.color || fallback;
              return (
                <linearGradient key={i} id={`bgrad-${uid}-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={shade(c, 0.28)} />
                  <stop offset="60%" stopColor={c} />
                  <stop offset="100%" stopColor={shade(c, -0.18)} />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
          <XAxis
            dataKey="name"
            interval={0}
            angle={-20}
            textAnchor="end"
            height={56}
            tick={{ fontSize: 10, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(0,152,216,0.06)" }}
            formatter={(v) => [`${v} ${unit}`, "Value"]}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              fontSize: 13,
            }}
          />
          <Bar
            dataKey="value"
            radius={[6, 6, 0, 0]}
            maxBarSize={48}
            style={{ filter: `url(#bshadow-${uid})` }}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={`url(#bgrad-${uid}-${i})`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
