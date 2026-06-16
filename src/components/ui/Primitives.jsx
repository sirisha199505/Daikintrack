import { motion } from "framer-motion";
import { classNames } from "../../utils/format";

export function Card({ className = "", children, ...rest }) {
  return (
    <div
      className={classNames(
        "rounded-2xl bg-white border border-slate-200/70 shadow-[var(--shadow-card)]",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  as: Tag = "button",
  ...rest
}) {
  const sizes = {
    sm: "px-3 py-1.5 text-sm gap-1.5",
    md: "px-4 py-2.5 text-sm gap-2",
    lg: "px-5 py-3 text-base gap-2",
  };
  const variants = {
    primary:
      "bg-daikin-btn text-white shadow-[var(--shadow-soft)] hover:brightness-110",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
    outline:
      "bg-white text-daikin-700 border border-daikin-200 hover:bg-daikin-50",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
    subtle: "bg-slate-100 text-slate-700 hover:bg-slate-200",
  };
  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      className="inline-flex"
      style={{ display: "inline-flex" }}
    >
      <Tag
        className={classNames(
          "inline-flex items-center justify-center rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
          sizes[size],
          variants[variant],
          className
        )}
        {...rest}
      >
        {children}
      </Tag>
    </motion.div>
  );
}

export function Badge({ children, tone = "slate", className = "" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-daikin-50 text-daikin-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
  };
  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Spinner({ className = "" }) {
  return (
    <svg
      className={classNames("animate-spin h-5 w-5 text-daikin-600", className)}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-20"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"
      />
    </svg>
  );
}

export function Skeleton({ className = "" }) {
  return (
    <div
      className={classNames(
        "relative overflow-hidden rounded-xl bg-slate-200/70 shimmer",
        className
      )}
    />
  );
}

export function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {Icon && (
        <div className="h-14 w-14 rounded-2xl bg-daikin-50 text-daikin-500 grid place-items-center mb-4">
          <Icon className="h-7 w-7" />
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      {subtitle && (
        <p className="text-sm text-slate-500 mt-1 max-w-sm">{subtitle}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, tone = "blue", delay = 0 }) {
  const tones = {
    blue: "bg-daikin-50 text-daikin-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-500",
    green: "bg-emerald-50 text-emerald-600",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      <Card className="p-4 sm:p-5 flex items-center gap-4 hover:shadow-[var(--shadow-soft)] transition-shadow">
        <div
          className={classNames(
            "h-11 w-11 shrink-0 rounded-xl grid place-items-center",
            tones[tone]
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
            {label}
          </div>
          <div className="text-2xl font-bold text-slate-800 leading-tight">
            {value}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
