import { Printer, Download, FileSpreadsheet } from "lucide-react";
import { Card, Button, EmptyState, Skeleton } from "../ui/Primitives";
import { exportReportCsv, printReport } from "../../utils/reports";

// Generic ERP-style report table: sticky header, totals footer, print + CSV.
// columns: [{ key, label, align?: 'right', format?: (val,row)=>node, csv?: (val,row)=>string }]
export default function ReportTable({ title, columns, rows, totals, loading, filename = "report" }) {
  const csvCols = columns.map((c) => ({ label: c.label, key: c.key, format: c.csv || c.format }));

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 print:hidden">
        <h3 className="font-bold text-slate-700">{title}</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => exportReportCsv(filename, csvCols, rows)} disabled={!rows.length}>
            <FileSpreadsheet className="h-4 w-4" /> CSV
          </Button>
          <Button size="sm" variant="outline" onClick={printReport} disabled={!rows.length}>
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2 p-5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <div className="p-8"><EmptyState icon={Download} title="No data" subtitle="No records for the selected filters." /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className={`px-4 py-3 font-semibold ${c.align === "right" ? "text-right" : ""}`}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r, i) => (
                <tr key={r.id ?? i} className="hover:bg-slate-50/60">
                  {columns.map((c) => (
                    <td key={c.key} className={`px-4 py-2.5 ${c.align === "right" ? "text-right tabular-nums" : ""}`}>
                      {c.format ? c.format(r[c.key], r) : (r[c.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {totals && (
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-700">
                  {columns.map((c, i) => (
                    <td key={c.key} className={`px-4 py-3 ${c.align === "right" ? "text-right tabular-nums" : ""}`}>
                      {i === 0 ? "Total" : totals[c.key] != null ? totals[c.key] : ""}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </Card>
  );
}
