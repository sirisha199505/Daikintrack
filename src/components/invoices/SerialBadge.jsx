/* eslint-disable react-refresh/only-export-components */
import { useNavigate } from "react-router-dom";

// Status → tone mapping for a unit's lifecycle.
export const SERIAL_TONES = {
  available: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  reserved: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  sold: "bg-slate-100 text-slate-600 ring-slate-200",
  returned: "bg-amber-50 text-amber-700 ring-amber-200",
  under_inspection: "bg-yellow-50 text-yellow-700 ring-yellow-200",
  repair: "bg-orange-50 text-orange-700 ring-orange-200",
  replaced: "bg-blue-50 text-blue-700 ring-blue-200",
  damaged: "bg-red-50 text-red-700 ring-red-200",
};

export const STATUS_LABEL = {
  available: "Available",
  reserved: "Reserved",
  sold: "Sold",
  returned: "Returned",
  under_inspection: "Under Inspection",
  repair: "Repair",
  replaced: "Replaced",
  damaged: "Damaged",
};

// A monospace serial pill, tinted by status, that links to the unit's history.
export default function SerialBadge({ serialNo, status = "available", clickable = true }) {
  const navigate = useNavigate();
  const tone = SERIAL_TONES[status] || SERIAL_TONES.available;
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => clickable && navigate(`/app/product-history?serial=${encodeURIComponent(serialNo)}`)}
      title={STATUS_LABEL[status] || status}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold ring-1 ${tone} ${
        clickable ? "cursor-pointer hover:brightness-95" : "cursor-default"
      }`}
    >
      {serialNo}
    </button>
  );
}
