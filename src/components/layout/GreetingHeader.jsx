import { motion } from "framer-motion";
import { greeting } from "../../utils/format";

export default function GreetingHeader({ name, subtitle, badge }) {
  const now = new Date();

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
        {badge || null}
      </div>
    </motion.div>
  );
}
