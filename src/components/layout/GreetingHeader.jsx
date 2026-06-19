import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { greeting, fmtTime } from "../../utils/format";

export default function GreetingHeader({ name, subtitle, badge }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(t);
  }, []);

  const dateStr = now.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-daikin-gradient relative overflow-hidden rounded-2xl px-4 py-3 text-white shadow-[var(--shadow-soft)]"
    >
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/5" />
      <div className="relative flex flex-col gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
            {greeting(now)}
          </div>
          <h1 className="truncate text-lg font-extrabold leading-tight sm:text-xl">{name}</h1>
          <p className="text-xs text-white/75">{subtitle}</p>
        </div>
        {badge ? (
          badge
        ) : (
          <div className="flex items-center gap-2 self-start rounded-lg bg-white/10 px-2.5 py-1 text-white/90 ring-1 ring-white/15">
            <span className="text-sm font-bold tabular-nums">{fmtTime(now)}</span>
            <span className="text-[10px] text-white/60">{dateStr}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
