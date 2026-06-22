import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Upload, RotateCcw, Check, Cable, Coins, Info } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useInventory } from "../../context/InventoryContext";
import { useAdmin } from "../../context/AdminContext";
import { useCopperScans } from "../../context/CopperScanContext";
import { useToast } from "../../components/ui/Toast";
import { Card } from "../../components/ui/Primitives";
import CopperTabs from "../../components/copper/CopperTabs";
import { referenceById } from "../../lib/copper";

const REF = referenceById("coin10");
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const pxDist = (a, b, W, H) => Math.hypot((a.x - b.x) * W, (a.y - b.y) * H);

// Downscale + compress a photo to a base64 JPEG (no file store on the API).
function fileToDataUrl(file, max = 1400, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function CopperScan() {
  const { user } = useAuth();
  const { viewBranchId } = useInventory();
  const { branches } = useAdmin();
  const { createScan } = useCopperScans();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [image, setImage] = useState(null);
  const [mode, setMode] = useState("trace"); // trace | coil
  const [wireMode, setWireMode] = useState("straight"); // straight | curved
  const [refCm, setRefCm] = useState(String(REF.cm));

  const [calib, setCalib] = useState([]); // 2 pts: the scale line across the coin
  const [trace, setTrace] = useState([]); // trace path (flat) — drag samples points
  const [coilPts, setCoilPts] = useState([]); // 2 pts across one loop
  const [turns, setTurns] = useState("10");

  const [notes, setNotes] = useState("");
  const [branchId, setBranchId] = useState(viewBranchId || user.branchId || "");
  const [saving, setSaving] = useState(false);

  const boxRef = useRef(null);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const drawingScale = useRef(false);
  const drawingWire = useRef(false);
  const drawingLoop = useRef(false);

  const isCoil = mode === "coil";
  const refMm = (Number(refCm) || 0) * 10;
  const scaleSet = calib.length === 2;
  const turnsNum = Math.max(0, parseInt(turns, 10) || 0);

  const pxPerMm = useMemo(() => {
    if (calib.length < 2 || !refMm || !boxRef.current) return 0;
    const W = boxRef.current.clientWidth;
    const H = boxRef.current.clientHeight;
    return pxDist(calib[0], calib[1], W, H) / refMm;
  }, [calib, refMm]);

  // Effective wire length in metres.
  const lengthM = useMemo(() => {
    if (!pxPerMm || !boxRef.current) return 0;
    const W = boxRef.current.clientWidth;
    const H = boxRef.current.clientHeight;
    if (isCoil) {
      if (coilPts.length < 2 || turnsNum < 1) return 0;
      const diaMm = pxDist(coilPts[0], coilPts[1], W, H) / pxPerMm;
      return (turnsNum * Math.PI * diaMm) / 1000;
    }
    if (trace.length < 2) return 0;
    let px = 0;
    for (let i = 1; i < trace.length; i++) px += pxDist(trace[i], trace[i - 1], W, H);
    return px / pxPerMm / 1000;
  }, [isCoil, trace, coilPts, turnsNum, pxPerMm]);

  const lengthCm = lengthM * 100;
  const needsBranch = !branchId;

  function toPoint(e) {
    const rect = boxRef.current.getBoundingClientRect();
    return {
      x: clamp01((e.clientX - rect.left) / rect.width),
      y: clamp01((e.clientY - rect.top) / rect.height),
    };
  }

  function onPointerDown(e) {
    if (!boxRef.current || !image) return;
    const p = toPoint(e);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (!scaleSet) {
      setCalib([p, p]);
      drawingScale.current = true;
      return;
    }
    if (isCoil) {
      setCoilPts([p, p]);
      drawingLoop.current = true;
      return;
    }
    if (wireMode === "straight") {
      setTrace([p, p]);
    } else {
      setTrace([p]);
    }
    drawingWire.current = true;
  }

  function onPointerMove(e) {
    if (!boxRef.current) return;
    const p = toPoint(e);
    if (drawingScale.current) return setCalib((prev) => [prev[0], p]);
    if (drawingLoop.current) return setCoilPts((prev) => [prev[0], p]);
    if (drawingWire.current) {
      if (wireMode === "straight") return setTrace((prev) => [prev[0], p]);
      // curved: sample points along the drag
      setTrace((prev) => {
        const last = prev[prev.length - 1];
        if (!last) return [p];
        const W = boxRef.current.clientWidth;
        const H = boxRef.current.clientHeight;
        return pxDist(last, p, W, H) < 5 ? prev : [...prev, p];
      });
    }
  }
  function onPointerUp() {
    drawingScale.current = false;
    drawingWire.current = false;
    drawingLoop.current = false;
  }

  function switchMode(next) {
    setMode(next);
    setTrace([]);
    setCoilPts([]);
  }
  function clearWire() {
    setTrace([]);
    setCoilPts([]);
  }

  async function onPickImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImage(await fileToDataUrl(file));
      setCalib([]);
      setTrace([]);
      setCoilPts([]);
    } catch {
      toast("Could not read that image. Try another.", "error");
    } finally {
      e.target.value = "";
    }
  }

  function startOver() {
    setImage(null);
    setCalib([]);
    setTrace([]);
    setCoilPts([]);
    setNotes("");
  }

  async function save() {
    if (needsBranch) return toast("Select a branch first.", "error");
    if (lengthM <= 0) return toast("Measure the wire before saving.", "error");
    setSaving(true);
    try {
      await createScan({
        branchId,
        referenceType: "coin10",
        referenceMm: refMm,
        pxPerMm,
        lengthM,
        image,
        notes,
        points: {
          mode,
          shape: isCoil ? "coil" : wireMode,
          reference: { id: "coin10", cm: Number(refCm) || 0, points: calib },
          trace,
          coil: isCoil ? { turns: turnsNum, points: coilPts } : null,
        },
      });
      toast(`Saved · ${lengthM.toFixed(2)} m`, "success");
      startOver();
      navigate("/app/copper/history");
    } catch (err) {
      toast(err.message || "Failed to save scan.", "error");
    } finally {
      setSaving(false);
    }
  }

  const step = !scaleSet ? "scale" : "wire";
  const banner = !scaleSet
    ? { cls: "border-violet-200 bg-violet-50 text-violet-800", badge: "Step 1 · draw scale",
        text: `Drag a line across the ${REF.label} (${REF.dimLabel}) — this sets the scale.` }
    : { cls: "border-cyan-200 bg-cyan-50 text-cyan-800",
        badge: lengthM > 0 ? "Step 2 · drawn ✓" : "Step 2 · draw the wire",
        text: isCoil
          ? "Drag a line across ONE loop of the coil, then set the number of turns."
          : wireMode === "straight"
          ? "Drag from one end of the wire to the other — straight-line distance."
          : "Drag along the wire following its curve. The length updates live." };

  return (
    <div className="space-y-5">
      <CopperTabs />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
            <Cable className="h-6 w-6 text-amber-600" /> Scan Wire
          </h1>
          <p className="text-sm text-slate-500">Set the scale with a reference, then measure the wire.</p>
        </div>
        {image && (
          <button onClick={startOver} className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-600">
            New scan
          </button>
        )}
      </div>

      {/* Mode tabs */}
      <div className="space-y-2">
        <div className="inline-flex rounded-xl bg-slate-100 p-1">
          {[
            { id: "trace", label: "Straight / curved wire" },
            { id: "coil", label: "Coiled wire (loops)" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => switchMode(t.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                mode === t.id ? "bg-white text-amber-700 shadow" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400">
          {isCoil
            ? "For wire wound in many loops: measure one loop and enter how many turns."
            : "For wire you can lay out: trace along it, following each bend."}
        </p>
      </div>

      {!image ? (
        <Card className="p-4">
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-slate-200 p-6 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-amber-50 text-amber-600">
              <Camera className="h-7 w-7" />
            </div>
            <div>
              <p className="font-semibold text-slate-700">Upload a photo of your wire</p>
              <p className="mt-1 max-w-sm text-xs text-slate-400">
                Place the copper wire on a flat surface next to a ₹10 coin, then upload or capture a
                clear photo.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-600">
                <Upload className="h-4 w-4" /> Choose image
              </button>
              <button onClick={() => cameraRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <Camera className="h-4 w-4" /> Use camera
              </button>
            </div>
            <p className="text-[11px] text-slate-400">JPG, PNG or WEBP · up to 10 MB</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Left: image + guided instruction */}
          <Card className="space-y-3 p-4">
            <div className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${banner.cls}`}>
              <p className="text-sm font-medium">{banner.text}</p>
              <span className="shrink-0 rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold">{banner.badge}</span>
            </div>

            {!isCoil && scaleSet && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Wire shape:</span>
                <div className="inline-flex rounded-lg bg-slate-100 p-1">
                  {["straight", "curved"].map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setWireMode(s);
                        setTrace([]);
                      }}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition ${
                        wireMode === s ? "bg-white text-amber-700 shadow" : "text-slate-500"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isCoil && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Is your wire <strong>wound in loops</strong>? Trace only measures wire laid out
                  flat. For a coil,{" "}
                  <button onClick={() => switchMode("coil")} className="font-semibold underline">
                    switch to Coil mode
                  </button>
                  .
                </span>
              </div>
            )}

            <div
              ref={boxRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              className="relative w-full touch-none select-none overflow-hidden rounded-xl border border-slate-200 cursor-crosshair"
            >
              <img src={image} alt="scan" draggable={false} className="block w-full" />
              <svg className="pointer-events-none absolute inset-0 h-full w-full">
                {calib.length === 2 && (
                  <line x1={`${calib[0].x * 100}%`} y1={`${calib[0].y * 100}%`} x2={`${calib[1].x * 100}%`} y2={`${calib[1].y * 100}%`} stroke="#7c3aed" strokeWidth="3" />
                )}
                {calib.map((p, i) => (
                  <circle key={`c${i}`} cx={`${p.x * 100}%`} cy={`${p.y * 100}%`} r="6" fill="#7c3aed" stroke="#fff" strokeWidth="2" />
                ))}
                {trace.slice(1).map((p, i) => (
                  <line key={`l${i}`} x1={`${trace[i].x * 100}%`} y1={`${trace[i].y * 100}%`} x2={`${p.x * 100}%`} y2={`${p.y * 100}%`} stroke="#06b6d4" strokeWidth="3" />
                ))}
                {coilPts.length === 2 && (
                  <line x1={`${coilPts[0].x * 100}%`} y1={`${coilPts[0].y * 100}%`} x2={`${coilPts[1].x * 100}%`} y2={`${coilPts[1].y * 100}%`} stroke="#06b6d4" strokeWidth="3" strokeDasharray="6 4" />
                )}
                {coilPts.map((p, i) => (
                  <circle key={`d${i}`} cx={`${p.x * 100}%`} cy={`${p.y * 100}%`} r="6" fill="#0891b2" stroke="#fff" strokeWidth="2" />
                ))}
              </svg>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setCalib([])} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                Redraw scale
              </button>
              <button onClick={clearWire} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                <RotateCcw className="h-3.5 w-3.5" /> Redraw {isCoil ? "loop" : "wire"}
              </button>
              <span className="text-xs text-slate-400">
                <span className="text-violet-600">▬</span> scale&nbsp;&nbsp;
                <span className="text-cyan-600">▬</span> {isCoil ? "loop" : "wire"}
              </span>
            </div>
          </Card>

          {/* Right: reference + turns + result + save */}
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <Coins className="h-4 w-4 text-amber-600" /> Reference object
              </h3>
              <p className="text-xs text-slate-400">Its known size sets the scale of the photo.</p>
              <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                🪙 {REF.label}
              </div>
              <label className="mt-3 block text-xs font-semibold text-slate-500">
                Coin diameter in cm (default 2.7)
                <input
                  type="number" step="0.1" min="0" value={refCm}
                  onChange={(e) => {
                    setRefCm(e.target.value);
                    setCalib([]);
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                />
              </label>
              {isCoil && (
                <label className="mt-3 block text-xs font-semibold text-slate-500">
                  Number of turns (loops) in the coil
                  <input
                    type="number" inputMode="numeric" min="1" step="1" value={turns}
                    onChange={(e) => setTurns(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                  />
                </label>
              )}
            </Card>

            {lengthM > 0 ? (
              <Card className="space-y-3 p-4">
                <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-5 text-center">
                  <div className="text-3xl font-extrabold text-amber-700">{lengthM.toFixed(2)} m</div>
                  <div className="text-sm font-medium text-amber-600/80">{lengthCm.toFixed(1)} cm</div>
                  <div className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">
                    {isCoil ? `coil · ${turnsNum} turns` : wireMode} wire length
                  </div>
                </div>

                {needsBranch && (
                  <label className="block text-xs font-semibold text-slate-500">
                    Branch
                    <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
                      <option value="">Select branch…</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </label>
                )}

                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Notes (optional) — e.g. stripped from old AC units"
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                />

                <button
                  onClick={save}
                  disabled={saving || lengthM <= 0}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" /> {saving ? "Saving…" : "Save to history"}
                </button>
                {isCoil && (
                  <p className="text-[11px] text-slate-400">
                    Coil mode is an estimate — accuracy depends on an even loop size and the turn count.
                  </p>
                )}
              </Card>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
                {!scaleSet
                  ? "Drag a line across your reference object to set the scale."
                  : isCoil
                  ? "Drag across one loop and enter the number of turns to see the length."
                  : "Drag along the wire to draw its path and see the length."}
              </div>
            )}
          </div>
        </div>
      )}

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPickImage} />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
    </div>
  );
}
