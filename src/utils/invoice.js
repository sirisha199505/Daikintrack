import { jsPDF } from "jspdf";
import { inr, fmtDateTime } from "./format";
import logoUrl from "/DAIKIN_logo.PNG";

// Load the real Daikin logo once and cache it as a PNG data URL so the printed
// document uses the exact same logo (and colours) as the app.
let logoPromise;
function getLogo() {
  if (!logoPromise) {
    logoPromise = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext("2d").drawImage(img, 0, 0);
          resolve({
            data: canvas.toDataURL("image/png"),
            w: img.naturalWidth,
            h: img.naturalHeight,
          });
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = logoUrl;
    });
  }
  return logoPromise;
}

// Build a branded Daikin invoice PDF for a transaction.
export async function buildInvoiceDoc(txn, product) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const unit = product?.price || 0;
  const total = unit * txn.quantity;

  // Header band
  doc.setFillColor(0, 31, 84);
  doc.rect(0, 0, W, 90, "F");

  // Daikin logo (same asset as the app); fall back to text if it can't load.
  const logo = await getLogo();
  let opsX = 145;
  if (logo) {
    const h = 34;
    const w = h * (logo.w / logo.h);
    doc.addImage(logo.data, "PNG", 40, 28, w, h);
    opsX = 40 + w + 12;
  } else {
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text("DAIKIN", 40, 50);
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("INVENTORY OPS", opsX, 52);
  doc.setFontSize(11);
  doc.text("TAX INVOICE", W - 40, 45, { align: "right" });

  // Invoice meta
  doc.setTextColor(20, 30, 50);
  doc.setFontSize(11);
  let y = 130;
  doc.setFont("helvetica", "bold");
  doc.text(`Invoice No: ${txn.invoiceNo}`, 40, y);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${fmtDateTime(txn.date)}`, 40, y + 18);
  doc.text(`Type: ${txn.status}`, 40, y + 36);

  doc.setFont("helvetica", "bold");
  doc.text("Branch", W - 40, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(`${txn.branchName}`, W - 40, y + 18, { align: "right" });
  doc.text(`Handled by ${txn.actor}`, W - 40, y + 36, { align: "right" });

  // Table header
  y += 80;
  doc.setFillColor(232, 246, 253);
  doc.rect(40, y - 16, W - 80, 26, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("PRODUCT", 50, y);
  doc.text("BARCODE", 250, y);
  doc.text("QTY", 400, y);
  doc.text("AMOUNT", W - 50, y, { align: "right" });

  // Row
  y += 30;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(String(txn.productName), 50, y, { maxWidth: 190 });
  doc.text(String(txn.barcode), 250, y);
  doc.text(String(txn.quantity), 400, y);
  doc.text(inr(total), W - 50, y, { align: "right" });
  doc.text(txn.category || "", 50, y + 14);

  // Totals
  y += 70;
  doc.setDrawColor(210, 220, 235);
  doc.line(40, y - 20, W - 40, y - 20);
  doc.setFont("helvetica", "normal");
  doc.text("Unit Price", W - 200, y);
  doc.text(inr(unit), W - 50, y, { align: "right" });
  doc.text("Quantity", W - 200, y + 18);
  doc.text(String(txn.quantity), W - 50, y + 18, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("TOTAL", W - 200, y + 44);
  doc.text(inr(total), W - 50, y + 44, { align: "right" });

  // Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 130, 150);
  doc.text(
    "This is a system-generated inventory movement document.",
    40,
    doc.internal.pageSize.getHeight() - 50
  );
  doc.text(
    "© 2026 Daikin Industries, Ltd.",
    W - 40,
    doc.internal.pageSize.getHeight() - 50,
    { align: "right" }
  );
  return doc;
}

export async function downloadInvoice(txn, product) {
  const doc = await buildInvoiceDoc(txn, product);
  doc.save(`${txn.invoiceNo}.pdf`);
}

export async function printInvoice(txn, product) {
  const doc = await buildInvoiceDoc(txn, product);
  doc.autoPrint();
  const url = doc.output("bloburl");
  const w = window.open(url, "_blank");
  if (w) w.focus();
}
