import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ScanLine,
  Keyboard,
  Camera,
  CameraOff,
  Search,
  QrCode,
} from "lucide-react";
import { Button } from "../ui/Primitives";

const MODES = [
  { id: "camera", label: "Scan Code", icon: ScanLine },
  { id: "manual", label: "Enter Manually", icon: Keyboard },
];

// Decide whether a scanned value is a QR code or a barcode.
// Uses the decoder's reported format when available, else a numeric heuristic
// (EAN/UPC barcodes are 8–14 digits).
function detectCodeType(code, formatName) {
  if (formatName) {
    return /qr/i.test(formatName) ? "qr" : "barcode";
  }
  const v = String(code).trim();
  return /^\d{8,14}$/.test(v) ? "barcode" : "qr";
}

// Safely stop & clear a scanner. html5-qrcode's stop() throws *synchronously*
// when the scanner isn't actively SCANNING (2) or PAUSED (3) — e.g. when it was
// never started (manual mode) or is still booting — so we guard on state and
// wrap everything in try/catch.
function stopScanner(inst) {
  if (!inst) return;
  try {
    const state = typeof inst.getState === "function" ? inst.getState() : 2;
    if (state === 2 || state === 3) {
      inst.stop().then(() => inst.clear()).catch(() => {});
    } else {
      inst.clear();
    }
  } catch {
    /* already stopped / not running — nothing to do */
  }
}

export default function Scanner({ onResult }) {
  const [mode, setMode] = useState("camera");
  const [manual, setManual] = useState("");
  const [camError, setCamError] = useState("");
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef(null);
  const lockedRef = useRef(false);
  const regionId = "daikin-scan-region";

  useEffect(() => {
    let cancelled = false;
    lockedRef.current = false;
    async function start() {
      setCamError("");
      if (mode === "manual") return;
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import(
          "html5-qrcode"
        );
        // A single scanner that recognises QR codes AND common barcodes.
        const formats = [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ];
        const instance = new Html5Qrcode(regionId, {
          formatsToSupport: formats,
          verbose: false,
        });
        scannerRef.current = instance;
        await instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 230, height: 230 } },
          (decoded, result) => {
            if (cancelled) return;
            const fmt = result?.result?.format?.formatName;
            handle(decoded, fmt);
          },
          () => {}
        );
        if (!cancelled) setScanning(true);
      } catch {
        if (!cancelled)
          setCamError("Camera unavailable. Use manual entry.");
      }
    }
    start();
    return () => {
      cancelled = true;
      stopScanner(scannerRef.current);
      scannerRef.current = null;
      setScanning(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  function handle(code, formatName) {
    // Guard against duplicate fires for the same scan.
    if (lockedRef.current) return;
    lockedRef.current = true;
    stopScanner(scannerRef.current);
    scannerRef.current = null;
    setScanning(false);
    const value = String(code).trim();
    onResult?.(value, detectCodeType(value, formatName));
  }

  return (
    <div className="space-y-5">
      {/* Mode switch */}
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
        {MODES.map((m) => {
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`relative flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition cursor-pointer ${
                active ? "text-daikin-700" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="scanmode"
                  className="absolute inset-0 rounded-lg bg-white shadow-sm"
                />
              )}
              <m.icon className="h-5 w-5 relative" />
              <span className="relative">{m.label}</span>
            </button>
          );
        })}
      </div>

      {mode !== "manual" ? (
        <div>
          <div className="relative mx-auto aspect-square w-full max-w-[320px] overflow-hidden rounded-2xl bg-slate-900">
            <div id={regionId} className="h-full w-full [&_video]:object-cover" />
            {/* Overlay frame */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-6 rounded-xl border-2 border-white/40" />
              <div className="absolute left-4 top-4 h-7 w-7 border-l-4 border-t-4 border-daikin-400 rounded-tl-lg" />
              <div className="absolute right-4 top-4 h-7 w-7 border-r-4 border-t-4 border-daikin-400 rounded-tr-lg" />
              <div className="absolute left-4 bottom-4 h-7 w-7 border-l-4 border-b-4 border-daikin-400 rounded-bl-lg" />
              <div className="absolute right-4 bottom-4 h-7 w-7 border-r-4 border-b-4 border-daikin-400 rounded-br-lg" />
              {scanning && (
                <div className="scanline absolute left-6 right-6 h-0.5 bg-daikin-400 shadow-[0_0_12px_2px_rgba(34,165,224,0.8)]" />
              )}
            </div>
            {!scanning && (
              <div className="absolute inset-0 grid place-items-center text-white/80">
                {camError ? (
                  <CameraOff className="h-10 w-10" />
                ) : (
                  <Camera className="h-10 w-10 animate-pulse" />
                )}
              </div>
            )}
          </div>
          <p className="mt-3 flex items-center justify-center gap-2 text-center text-xs text-slate-500">
            <QrCode className="h-3.5 w-3.5" />
            <ScanLine className="h-3.5 w-3.5" />
            {camError || "Point the camera at a QR code or barcode — type is detected automatically."}
          </p>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (manual.trim()) handle(manual);
          }}
          className="space-y-3"
        >
          <label className="block text-sm font-semibold text-slate-600">
            Enter QR / barcode value
          </label>
          <div className="relative">
            <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              autoFocus
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="e.g. 8901000010..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-mono tracking-wide outline-none focus:border-daikin-400 focus:bg-white focus:ring-2 focus:ring-daikin-100"
            />
          </div>
          <Button type="submit" className="w-full" size="lg">
            <Search className="h-4 w-4" /> Look up product
          </Button>
        </form>
      )}
    </div>
  );
}
