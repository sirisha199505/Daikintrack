// Lightweight client-side report exporters. CSV uses no external dependency;
// printing reuses the browser's print dialog with the @media print stylesheet
// that hides the app chrome (see index.css).

function csvCell(v) {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// columns: [{ key, label, format? }], rows: array of objects.
export function exportReportCsv(filename, columns, rows) {
  const header = columns.map((c) => csvCell(c.label)).join(",");
  const body = rows
    .map((r) => columns.map((c) => csvCell(c.format ? c.format(r[c.key], r) : r[c.key])).join(","))
    .join("\n");
  const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function printReport() {
  window.print();
}
