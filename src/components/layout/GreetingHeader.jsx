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
      className="bg-daikin-gradient relative overflow-hidden rounded-2xl p-5 sm:p-6 text-white shadow-[var(--shadow-soft)]"
    >
      <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/5" />
      <div className="absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-white/5" />
      <div className="relative flex items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">
            {greeting(now)}
          </div>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{name}</h1>
          <p className="mt-1 text-sm text-white/75">{subtitle}</p>
        </div>
        {badge ? (
          badge
        ) : (
          <div className="hidden shrink-0 rounded-xl bg-white/10 px-4 py-2.5 text-right ring-1 ring-white/15 sm:block">
            <div className="text-lg font-bold tabular-nums">{fmtTime(now)}</div>
            <div className="text-[11px] text-white/60">{dateStr}</div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
