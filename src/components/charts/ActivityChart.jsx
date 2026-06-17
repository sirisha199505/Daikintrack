import { useId } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { shade } from "../../utils/color";

export default function ActivityChart({ data, height = 300 }) {
  const uid = useId().replace(/:/g, "");
  const grad = (id, c) => (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={shade(c, 0.28)} />
      <stop offset="60%" stopColor={c} />
      <stop offset="100%" stopColor={shade(c, -0.18)} />
    </linearGradient>
  );
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={6} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <filter id={`ashadow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.22" />
            </filter>
            {grad(`in-${uid}`, "#0098d8")}
            {grad(`out-${uid}`, "#ef4444")}
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(0,152,216,0.06)" }}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              fontSize: 13,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
          <Bar
            dataKey="in"
            name="Check In"
            fill={`url(#in-${uid})`}
            radius={[6, 6, 0, 0]}
            maxBarSize={26}
            style={{ filter: `url(#ashadow-${uid})` }}
          />
          <Bar
            dataKey="out"
            name="Check Out"
            fill={`url(#out-${uid})`}
            radius={[6, 6, 0, 0]}
            maxBarSize={26}
            style={{ filter: `url(#ashadow-${uid})` }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
