import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Boxes,
  Activity,
  Loader2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Api } from "../lib/api";
import logo from "/DAIKIN_logo.PNG";
import warehouse from "/warehouse-bg.png";

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [warehouseCount, setWarehouseCount] = useState(null);

  useEffect(() => {
    if (user) navigate("/app", { replace: true });
  }, [user, navigate]);

  // Pull the live warehouse count so the marketing stat stays in sync with the DB.
  useEffect(() => {
    let cancelled = false;
    Api.publicStats()
      .then((s) => {
        if (!cancelled && s.warehouses != null) setWarehouseCount(s.warehouses);
      })
      .catch(() => {
        /* keep the placeholder if the count can't be fetched */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = [
    { icon: Boxes, value: warehouseCount == null ? "—" : String(warehouseCount), label: "Warehouses" },
    { icon: Activity, value: "Real-time", label: "Tracking" },
  ];

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await login({ username, password });
    if (!res.ok) {
      setError(res.error);
      setBusy(false);
    } else {
      // Land on the dashboard; routing picks the right pages for the role.
      navigate("/app", { replace: true });
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-daikin-50 to-[#dbeafc] flex items-center justify-center p-4 sm:p-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl lg:grid-cols-2"
      >
        {/* Left brand panel */}
        <div className="relative flex min-h-[260px] flex-col justify-between gap-6 p-8 text-white lg:min-h-[560px] lg:gap-0 lg:p-10">
          <img
            src={warehouse}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-navy/90 via-daikin-900/85 to-daikin-700/75" />
          <div className="relative">
            <motion.img
              src={logo}
              alt="Daikin"
              className="h-28 w-auto"
              initial={{ clipPath: "inset(0 100% 0 0)" }}
              animate={{ clipPath: "inset(0 0% 0 0)" }}
              transition={{ duration: 1.6, ease: "easeInOut" }}
            />
          </div>
          <div className="relative">
            <h1 className="text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-4xl lg:text-5xl lg:leading-[1.05]">
              Inventory Management System
            </h1>
            <p className="mt-4 max-w-sm text-sm text-white/80 lg:mt-5 lg:text-base">
              Streamline operations. Track stock. Manage every hub in real time.
            </p>
            <div className="mt-6 flex flex-wrap gap-6 lg:mt-8 lg:gap-8">
              {stats.map((s) => (
                <div key={s.label}>
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-white/10 ring-1 ring-white/20">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div className="mt-2 text-2xl font-bold">{s.value}</div>
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-white/60">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right form */}
        <div className="flex flex-col justify-center p-8 sm:p-12">
          <h2 className="text-3xl font-extrabold text-slate-800">
            Login
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Sign in with your credentials to continue.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
                spellCheck={false}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm outline-none focus:border-daikin-400 focus:bg-white focus:ring-2 focus:ring-daikin-100"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-11 text-sm outline-none focus:border-daikin-400 focus:bg-white focus:ring-2 focus:ring-daikin-100"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPw ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex cursor-pointer items-center gap-2 text-slate-600">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-daikin-600 accent-daikin-600"
                />
                Remember me
              </label>
              <button
                type="button"
                className="font-semibold text-daikin-600 hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={busy}
              className="bg-daikin-btn flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-[var(--shadow-soft)] transition hover:brightness-110 disabled:opacity-70"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </motion.button>

            <p className="pt-2 text-center text-xs text-slate-400">
              © 2026 Daikin Industries, Ltd.
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
