import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Pencil, Trash2, Phone, Mail, Building2, UserSquare, Truck } from "lucide-react";
import { Card, Button, EmptyState } from "../ui/Primitives";
import { useParties } from "../../context/PartyContext";
import { useToast } from "../ui/Toast";
import PartyFormModal from "./PartyFormModal";

// Shared list/table/search manager for suppliers and customers.
export default function PartyManager({ kind }) {
  const isSupplier = kind === "supplier";
  const parties = useParties();
  const { toast } = useToast();
  const list = isSupplier ? parties.suppliers : parties.customers;
  const del = isSupplier ? parties.deleteSupplier : parties.deleteCustomer;

  const [query, setQuery] = useState("");
  const [modal, setModal] = useState({ open: false, initial: null });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) =>
      [p.name, p.gstin, p.phone, p.email, p.code].some((v) => (v || "").toLowerCase().includes(q))
    );
  }, [list, query]);

  async function remove(p) {
    if (!window.confirm(`Delete ${p.name}? Historical records keep their reference.`)) return;
    try {
      await del(p.id);
      toast(`${isSupplier ? "Supplier" : "Customer"} deleted`, "success");
    } catch (e) {
      toast(e.message || "Failed to delete.", "error");
    }
  }

  const Icon = isSupplier ? Truck : UserSquare;
  const noun = isSupplier ? "Supplier" : "Customer";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{noun} Management</h1>
          <p className="text-sm text-slate-500">
            {isSupplier ? "Vendors that supply stock on purchase invoices." : "Buyers that stock is sold to on sales invoices."}
          </p>
        </div>
        <Button onClick={() => setModal({ open: true, initial: null })}>
          <Plus className="h-4 w-4" /> Add {noun}
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${noun.toLowerCase()}s, GSTIN, phone…`}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-daikin-400 focus:ring-2 focus:ring-daikin-100"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8">
          <EmptyState icon={Icon} title={`No ${noun.toLowerCase()}s`} subtitle={query ? "No matches for your search." : `Add your first ${noun.toLowerCase()} to get started.`} />
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Name</th>
                  <th className="px-5 py-3 font-semibold">GSTIN</th>
                  <th className="px-5 py-3 font-semibold">Contact</th>
                  <th className="px-5 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <div className="font-semibold text-slate-800">{p.name}</div>
                      {p.contact && <div className="text-xs text-slate-400">{p.contact}</div>}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{p.gstin || "—"}</td>
                    <td className="px-5 py-3 text-slate-500">
                      <div className="flex flex-col gap-0.5 text-xs">
                        {p.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{p.phone}</span>}
                        {p.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{p.email}</span>}
                        {!p.phone && !p.email && "—"}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => setModal({ open: true, initial: p })} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-daikin-50 hover:text-daikin-600 cursor-pointer"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => remove(p)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 cursor-pointer"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((p) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-800">{p.name}</div>
                      {p.gstin && <div className="font-mono text-xs text-slate-400">{p.gstin}</div>}
                      <div className="mt-1 flex flex-col gap-0.5 text-xs text-slate-500">
                        {p.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{p.phone}</span>}
                        {p.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{p.email}</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button onClick={() => setModal({ open: true, initial: p })} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-daikin-50 hover:text-daikin-600 cursor-pointer"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => remove(p)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 cursor-pointer"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Building2 className="h-3.5 w-3.5" /> {filtered.length} {noun.toLowerCase()}{filtered.length === 1 ? "" : "s"}
          </div>
        </>
      )}

      <PartyFormModal
        open={modal.open}
        kind={kind}
        initial={modal.initial}
        onClose={() => setModal({ open: false, initial: null })}
        onSaved={(edit) => toast(`${noun} ${edit ? "updated" : "added"}`, "success")}
      />
    </div>
  );
}
