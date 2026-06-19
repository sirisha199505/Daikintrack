import { useId } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Cell,
  LabelList,
  ResponsiveContainer,
} from "recharts";
import { shade } from "../../utils/color";

// Stacked warehouse comparison. `rows` = [{ id, name, [catId]: qty }]; each
// category becomes a stacked segment. `activeId` highlights one warehouse.
export default function WarehouseStackChart({
  rows,
  categories,
  activeId,
  height = 360,
}) {
  const uid = useId().replace(/:/g, "");
  // Angled, truncated branch names — readable and non-overlapping even when the
  // chart is narrow (mobile) with several branches.
  const renderTick = ({ x, y, payload }) => {
    const label = String(payload.value);
    const text = label.length > 12 ? `${label.slice(0, 11)}…` : label;
    return (
      <text
        x={x}
        y={y + 8}
        transform={`rotate(-35, ${x}, ${y + 8})`}
        textAnchor="end"
        fontSize={10}
        fontWeight={600}
        fill="#475569"
      >
        {text}
      </text>
    );
  };

  // Hide labels for small segments so the bars stay readable.
  const renderLabel = (props) => {
    const { x, y, width, height: h, value } = props;
    if (!value || h < 16 || width < 24) return null;
    return (
      <text
        x={x + width / 2}
        y={y + h / 2}
        fill="#fff"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={11}
        fontWeight={700}
      >
        {value}
      </text>
    );
  };

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 12 }}>
          <defs>
            <filter id={`wshadow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.22" />
            </filter>
            {categories.map((c, i) => (
              <linearGradient key={i} id={`wgrad-${uid}-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={shade(c.color, 0.3)} />
                <stop offset="60%" stopColor={c.color} />
                <stop offset="100%" stopColor={shade(c.color, -0.16)} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
          <XAxis
            dataKey="name"
            tick={renderTick}
            interval={0}
            height={52}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
          {categories.map((c, ci) => (
            <Bar
              key={c.id}
              dataKey={c.id}
              name={c.name}
              stackId="warehouse"
              fill={`url(#wgrad-${uid}-${ci})`}
              maxBarSize={84}
              style={{ filter: `url(#wshadow-${uid})` }}
            >
              {rows.map((r) => (
                <Cell
                  key={r.id}
                  fillOpacity={!activeId || r.id === activeId ? 1 : 0.28}
                />
              ))}
              <LabelList dataKey={c.id} content={renderLabel} />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
