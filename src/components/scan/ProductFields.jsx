import { useState } from "react";
import { Layers, Boxes, Gauge, Plus, Trash2, Check, Pencil, Barcode } from "lucide-react";
import { CATEGORIES, TYPES, UNITS, MODEL_NOS, lookupModel } from "../../lib/daikinMapping";

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm outline-none focus:border-daikin-400 focus:bg-white focus:ring-2 focus:ring-daikin-100";

const EMPTY = { model: "", category: "", type: "", capacity: "", unit: "" };

// Product classification fields (Model No / Category / Type / Capacity / Unit)
// sourced from the client's mapping sheet, shown below the scanner on
// Check-In / Check-Out. Every field is fully editable: pick from the suggestion
// list OR type a custom value. Entering a known Model No auto-fills the rest.
// Saved rows can be edited in place or removed. `entries` is the saved list;
// `onEntriesChange` receives the updated array.
export default function ProductFields({ draft = EMPTY, onDraftChange, entries = [], onEntriesChange, onModelPicked }) {
  const [editingIdx, setEditingIdx] = useState(-1);

  const canSave = draft.model || draft.category || draft.type || draft.capacity || draft.unit;
  const setDraft = (next) => onDraftChange?.(next);

  function set(patch) {
    // Typing/selecting a known Model No auto-fills Category/Type/Capacity/Unit
    // and asks the parent to pull in the matching product line automatically.
    if (patch.model !== undefined) {
      const hit = lookupModel(patch.model);
      if (hit) {
        patch = {
          ...patch,
          category: hit.category,
          type: hit.type,
          capacity: hit.capacity == null ? "" : String(hit.capacity),
          unit: hit.unit || "",
        };
        onModelPicked?.(hit.model);
      }
    }
    setDraft({ ...draft, ...patch });
  }

  function save() {
    if (!canSave) return;
    if (editingIdx >= 0) {
      onEntriesChange?.(entries.map((e, i) => (i === editingIdx ? draft : e)));
    } else {
      onEntriesChange?.([...entries, draft]);
    }
    setDraft(EMPTY);
    setEditingIdx(-1);
  }

  function editEntry(i) {
    setDraft(entries[i]);
    setEditingIdx(i);
  }

  function removeEntry(i) {
    onEntriesChange?.(entries.filter((_, idx) => idx !== i));
    if (editingIdx === i) { setDraft(EMPTY); setEditingIdx(-1); }
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
        <Layers className="h-4 w-4 text-daikin-500" /> Product Details
        {editingIdx >= 0 && (
          <span className="rounded-full bg-daikin-100 px-2 py-0.5 text-xs font-semibold text-daikin-700">
            Editing row {editingIdx + 1}
          </span>
        )}
      </p>

      {/* Suggestion lists — inputs stay free-text editable */}
      <datalist id="pf-models">
        {MODEL_NOS.map((m) => <option key={m} value={m} />)}
      </datalist>
      <datalist id="pf-categories">
        {CATEGORIES.map((c) => <option key={c} value={c} />)}
      </datalist>
      <datalist id="pf-types">
        {TYPES.map((t) => <option key={t} value={t} />)}
      </datalist>
      <datalist id="pf-units">
        {UNITS.map((u) => <option key={u} value={u} />)}
      </datalist>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-semibold text-slate-500">
            <Barcode className="mr-1 inline h-3.5 w-3.5 text-slate-400" />Model No
          </span>
          <input list="pf-models" className={`${inputCls} font-mono`} value={draft.model}
            onChange={(e) => set({ model: e.target.value })} placeholder="Scan or type — auto-fills the rest" />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-500">Category</span>
          <input list="pf-categories" className={inputCls} value={draft.category}
            onChange={(e) => set({ category: e.target.value })} placeholder="Type or pick…" />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-500">
            <Boxes className="mr-1 inline h-3.5 w-3.5 text-slate-400" />Type
          </span>
          <input list="pf-types" className={inputCls} value={draft.type}
            onChange={(e) => set({ type: e.target.value })} placeholder="Type or pick…" />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-500">
            <Gauge className="mr-1 inline h-3.5 w-3.5 text-slate-400" />Capacity
          </span>
          <input type="number" step="0.01" className={inputCls} value={draft.capacity}
            onChange={(e) => set({ capacity: e.target.value })} placeholder="Auto-fills from Model" />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-500">Unit</span>
          <input list="pf-units" className={inputCls} value={draft.unit}
            onChange={(e) => set({ unit: e.target.value })} placeholder="Type or pick…" />
        </label>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button type="button" onClick={save} disabled={!canSave}
          className="inline-flex items-center gap-1.5 rounded-lg bg-daikin-600 px-3 py-2 text-sm font-semibold text-white hover:bg-daikin-700 disabled:cursor-not-allowed disabled:opacity-40">
          {editingIdx >= 0 ? <><Check className="h-4 w-4" /> Update</> : <><Plus className="h-4 w-4" /> Save details</>}
        </button>
        {(canSave || editingIdx >= 0) && (
          <button type="button" onClick={() => { setDraft(EMPTY); setEditingIdx(-1); }}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100">
            Clear
          </button>
        )}
      </div>

      {/* Saved rows — each editable / removable */}
      {entries.length > 0 && (
        <ul className="mt-3 space-y-2">
          {entries.map((e, i) => (
            <li key={i} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <span className="min-w-0 truncate text-slate-700">
                {e.model && <span className="font-mono font-semibold text-daikin-700">{e.model}</span>}
                {e.model ? " · " : ""}
                <span className="font-semibold">{e.category || "—"}</span>
                {" · "}{e.type || "—"}
                {e.capacity ? ` · ${e.capacity}${e.unit ? " " + e.unit : ""}` : e.unit ? ` · ${e.unit}` : ""}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <button type="button" onClick={() => editEntry(i)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-daikin-50 hover:text-daikin-600">
                  <Pencil className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => removeEntry(i)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
