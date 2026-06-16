/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};
const COLORS = {
  success: "text-emerald-500",
  error: "text-red-500",
  info: "text-daikin-500",
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback(
    (id) => setToasts((t) => t.filter((x) => x.id !== id)),
    []
  );

  const toast = useCallback(
    (message, type = "success") => {
      const id = `${Date.now()}-${Math.round(Math.random() * 1000)}`;
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => dismiss(id), 3200);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2 w-[min(92vw,360px)]">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = ICONS[t.type] || Info;
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 40, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.95 }}
                className="flex items-start gap-3 rounded-xl bg-white shadow-xl border border-slate-100 px-4 py-3"
              >
                <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${COLORS[t.type]}`} />
                <p className="text-sm text-slate-700 flex-1 font-medium">
                  {t.message}
                </p>
                <button
                  onClick={() => dismiss(t.id)}
                  className="text-slate-300 hover:text-slate-500 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
