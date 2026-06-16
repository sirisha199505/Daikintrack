import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export default function DonutChart({ data, height = 260 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div style={{ height }} className="relative w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="98%"
            paddingAngle={2}
            stroke="none"
            isAnimationActive
            animationDuration={700}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v, n) => [`${v} units`, n]}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              boxShadow: "0 8px 24px rgba(16,24,40,.12)",
              fontSize: 13,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-bold text-slate-800">{total}</span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          units
        </span>
      </div>
    </div>
  );
}
