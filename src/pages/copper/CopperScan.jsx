import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Cable,
  Camera,
  Save,
  AlertTriangle,
  CircleDot,
  Check,
  Upload,
  RefreshCw,
  RotateCcw,
  Ruler,
  Minus,
  X,
} from "lucide-react";
import { Card, Button, Spinner } from "../../components/ui/Primitives";
import CopperTabs from "../../components/copper/CopperTabs";
import { useAuth } from "../../context/AuthContext";
import { useInventory } from "../../context/InventoryContext";
import { useCopperScans } from "../../context/CopperScanContext";
import { useToast } from "../../components/ui/Toast";
import {
  detectSpiral,
  spiralLengthM,
  spiralConfidence,
  fmtLength,
  REFERENCES,
  referenceById,
  polylinePx,
} from "../../lib/copper";

// CopperScan — "Calibration Frame" measurement (automatic).
//
// A flat copper coil is photographed from the top inside a fixed square frame
// of known size (FRAME_CM). The frame is the scale reference, so
// pixels → centimetres is just frameSidePx / FRAME_CM. The image is then
// analysed (see detectSpiral in lib/copper.js): the coil's centre, outer
// diameter, inner-hole diameter and visible turn count are read straight from
// the pixels, and the length follows the Archimedean-spiral identity
//   length = π · N · (D_outer + D_inner) / 2.
// The operator only confirms / nudges the turn count, which is the least
// reliable thing to read from a single photo.

const FRAME_CM = 15; // calibration square edge, in centimetres
const FRAME_FRAC = 0.62; // fraction of the shorter media edge it occupies

// Measure a DOM node's rendered size, re-running whenever the node mounts.
function useElementSize() {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const roRef = useRef(null);
  const ref = useCallback((node) => {
    if (roRef.current) {
      roRef.current.disconnect();
      roRef.current = null;
    }
    if (node) {
      const update = () => {
        const r = node.getBoundingClientRect();
        setSize({ w: r.width, h: r.height });
      };
      update();
      const ro = new ResizeObserver(update);
      ro.observe(node);
      roRef.current = ro;
    }
  }, []);
  return [ref, size];
}

export default function CopperScan() {
  const { user } = useAuth();
  const { viewBranchId } = useInventory();
  const { createScan } = useCopperScans();
  const { toast } = useToast();

  const [stage, setStage] = useState("intro"); // intro | camera | measure
  const [mode, setMode] = useState("coil"); // coil (auto spiral) | straight (reference line)
  const [camError, setCamError] = useState("");
  const [captured, setCaptured] = useState(null); // base64 JPEG of the still
  const [capAspect, setCapAspect] = useState(3 / 4);
  const [camAspect, setCamAspect] = useState(3 / 4);

  const [detection, setDetection] = useState(null);
  const [detecting, setDetecting] = useState(false);
  const [sensitivity, setSensitivity] = useState(50); // 0–100 slider
  const [redetect, setRedetect] = useState(0); // bump to force a re-run
  const [turns, setTurns] = useState(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileRef = useRef(null);
  const [mediaRef, mediaSize] = useElementSize();

  // Geometry of the calibration square in the current media coordinate space.
  const frame = useMemo(() => {
    const side = FRAME_FRAC * Math.min(mediaSize.w, mediaSize.h);
    return {
      side,
      x: (mediaSize.w - side) / 2,
      y: (mediaSize.h - side) / 2,
      pxPerCm: side > 0 ? side / FRAME_CM : 0,
    };
  }, [mediaSize]);

  // ---- Camera lifecycle -----------------------------------------------------
  useEffect(() => {
    if (stage !== "camera") return undefined;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        if (!cancelled)
          setCamError(
            "Couldn't open the camera. Grant camera permission and use a device with a rear camera, or upload a photo instead."
          );
      }
    })();
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [stage]);

  // Stop the camera if the component unmounts mid-capture.
  useEffect(
    () => () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    },
    []
  );

  // ---- Automatic detection on the captured still ----------------------------
  useEffect(() => {
    if (
      mode !== "coil" ||
      stage !== "measure" ||
      !captured ||
      mediaSize.w < 1 ||
      frame.pxPerCm <= 0
    )
      return undefined;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const w = Math.round(mediaSize.w);
      const h = Math.round(mediaSize.h);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h); // same mapping as the on-screen <img>
      const { data } = ctx.getImageData(0, 0, w, h);
      const det = detectSpiral({
        data,
        width: w,
        height: h,
        frame,
        sensitivity: (50 - sensitivity) / 250, // higher slider → fainter lines
      });
      if (cancelled) return;
      setDetection(det);
      if (det) setTurns(det.turns || 0);
      setDetecting(false);
    };
    img.onerror = () => {
      if (!cancelled) {
        setDetection(null);
        setDetecting(false);
      }
    };
    img.src = captured;
    return () => {
      cancelled = true;
    };
  }, [mode, stage, captured, mediaSize.w, mediaSize.h, frame, sensitivity, redetect]);

  function openCamera() {
    setCamError("");
    setStage("camera");
  }

  function capture() {
    const v = videoRef.current;
    if (!v || !v.videoWidth || !v.videoHeight) {
      setCamError("Camera is still warming up — wait a moment and try again.");
      return;
    }
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
    setCaptured(c.toDataURL("image/jpeg", 0.72));
    setCapAspect(v.videoWidth / v.videoHeight);
    setDetection(null);
    setDetecting(true);
    setNotes("");
    setStage("measure");
  }

  // Load a still from an uploaded / gallery file instead of the live camera.
  function onPickFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Please choose an image file.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      const img = new Image();
      img.onload = () => {
        setCaptured(url);
        setCapAspect(img.naturalWidth / img.naturalHeight || 3 / 4);
        setDetection(null);
        setDetecting(true);
        setNotes("");
        setStage("measure");
      };
      img.onerror = () => toast("That image couldn't be read.", "error");
      img.src = url;
    };
    reader.onerror = () => toast("That image couldn't be read.", "error");
    reader.readAsDataURL(file);
  }

  function retake() {
    setCaptured(null);
    setDetection(null);
    setStage("intro");
  }

  // ---- Derived measurements -------------------------------------------------
  const outerCm = detection ? (2 * detection.outerR) / frame.pxPerCm : 0;
  const innerCm = detection ? (2 * detection.innerR) / frame.pxPerCm : 0;
  const lengthM = spiralLengthM({ turns, outerCm, innerCm });
  const confidence = detection ? spiralConfidence({ turns, outerCm, innerCm }) : 0;
  const ready = Boolean(detection) && outerCm > innerCm && turns >= 1;

  async function save() {
    const branchId = viewBranchId || user.branchId;
    if (!branchId) {
      toast("Select a branch first.", "error");
      return;
    }
    setSaving(true);
    try {
      await createScan({
        branchId,
        method: "coil",
        referenceType: "frame",
        referenceMm: FRAME_CM * 10,
        pxPerMm: frame.pxPerCm / 10,
        lengthM,
        image: captured,
        points: {
          kind: "spiral_auto",
          turns,
          outerCm: Math.round(outerCm * 10) / 10,
          innerCm: Math.round(innerCm * 10) / 10,
          confidence,
        },
        notes: notes.trim() || null,
      });
      toast("Coil scan saved", "success");
      retake();
    } catch (e) {
      toast(e.message || "Could not save the scan.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <CopperTabs />

      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-800 sm:text-2xl">
          <Cable className="h-6 w-6 text-amber-600" /> Measure Copper
        </h1>
        <p className="text-sm text-slate-500">
          {mode === "coil"
            ? `Coil method — photograph the flat coil inside the ${FRAME_CM} cm frame; the length is read automatically from the image.`
            : "Straight wire method — photograph the pipe beside a known reference, mark the reference and the wire, and the length is scaled from it."}
        </p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPickFile}
      />

      {stage === "intro" && (
        <Intro
          mode={mode}
          setMode={setMode}
          onStart={openCamera}
          onUpload={() => fileRef.current?.click()}
        />
      )}

      {stage === "camera" && (
        <Card className="overflow-hidden p-0">
          <div
            ref={mediaRef}
            style={{ aspectRatio: camAspect }}
            className="relative mx-auto w-full max-w-md bg-slate-900"
          >
            <video
              ref={videoRef}
              playsInline
              muted
              onLoadedMetadata={(e) =>
                setCamAspect(
                  e.currentTarget.videoWidth / e.currentTarget.videoHeight || 3 / 4
                )
              }
              className="h-full w-full object-cover"
            />
            {mode === "coil" ? (
              <FrameOverlay frame={frame} />
            ) : (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-slate-900/55 px-3 py-2 text-center text-[11px] font-medium text-amber-200">
                Keep a known reference (A4 sheet / tape) flat next to the pipe, in the same plane.
              </div>
            )}
            {camError && (
              <div className="absolute inset-0 grid place-items-center bg-slate-900/80 p-6 text-center">
                <div className="space-y-2 text-slate-200">
                  <AlertTriangle className="mx-auto h-8 w-8 text-amber-400" />
                  <p className="text-sm">{camError}</p>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 p-4">
            <Button variant="subtle" onClick={() => setStage("intro")}>
              <X className="h-4 w-4" /> Cancel
            </Button>
            <Button onClick={capture} disabled={Boolean(camError)}>
              <Camera className="h-4 w-4" /> Capture
            </Button>
          </div>
        </Card>
      )}

      {stage === "measure" && captured && mode === "straight" && (
        <StraightMeasure captured={captured} capAspect={capAspect} onRetake={retake} />
      )}

      {stage === "measure" && captured && mode === "coil" && (
        <div className="space-y-4">
          <Card className="overflow-hidden p-0">
            <div
              ref={mediaRef}
              style={{ aspectRatio: capAspect }}
              className="relative mx-auto w-full max-w-md select-none bg-slate-900"
            >
              <img
                src={captured}
                alt="Captured coil"
                className="h-full w-full object-cover"
                draggable={false}
              />
              <FrameOverlay frame={frame} detection={detection} />
              {detecting && (
                <div className="absolute inset-0 grid place-items-center bg-slate-900/40">
                  <div className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700">
                    <Spinner className="h-4 w-4" /> Detecting coil…
                  </div>
                </div>
              )}
            </div>
          </Card>

          {!detection && !detecting && (
            <Card className="flex items-start gap-3 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <p className="text-sm text-slate-600">
                Couldn't find a coil inside the frame. Make sure the whole coil sits inside the
                square with good contrast against the background, then adjust sensitivity below or
                retake.
              </p>
            </Card>
          )}

          {/* Controls */}
          <Card className="space-y-4 p-4">
            <div>
              <div className="mb-1 flex items-center justify-between text-sm font-semibold text-slate-700">
                <span>Line sensitivity</span>
                <span className="text-xs font-normal text-slate-400">
                  raise it if faint loops are missed
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={sensitivity}
                onChange={(e) => {
                  setSensitivity(Number(e.target.value));
                  setDetecting(true);
                }}
                className="w-full accent-amber-500"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
              <div>
                <span className="text-sm font-semibold text-slate-700">Detected turns (N)</span>
                <p className="text-[11px] text-slate-400">Auto-counted — correct it if needed.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="subtle" onClick={() => setTurns((n) => Math.max(0, n - 1))}>−</Button>
                <input
                  type="number"
                  min="0"
                  value={turns}
                  onChange={(e) => setTurns(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                  className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-sm font-bold text-slate-800 outline-none focus:border-amber-400"
                />
                <Button size="sm" variant="subtle" onClick={() => setTurns((n) => n + 1)}>+</Button>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setRedetect((n) => n + 1);
                setDetecting(true);
              }}
            >
              <RefreshCw className="h-4 w-4" /> Re-detect
            </Button>
          </Card>

          {/* Result readout */}
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Readout label="Detected loops" value={ready ? turns : "—"} />
              <Readout label="Outer Ø" value={outerCm ? `${outerCm.toFixed(1)} cm` : "—"} />
              <Readout label="Inner Ø" value={innerCm ? `${innerCm.toFixed(1)} cm` : "—"} />
              <Readout label="Confidence" value={detection ? `${confidence}%` : "—"} />
            </div>
            <div className="mt-4 flex items-end justify-between rounded-xl bg-amber-50 px-4 py-3">
              <span className="text-sm font-semibold text-amber-700">Calculated length</span>
              <span className="text-2xl font-extrabold text-amber-700">
                {ready ? fmtLength(lengthM) : "—"}
              </span>
            </div>
          </Card>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Notes (optional)…"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-400"
          />

          <div className="flex items-center justify-between gap-3">
            <Button variant="subtle" onClick={retake}>
              <RotateCcw className="h-4 w-4" /> Retake
            </Button>
            <Button variant="success" onClick={save} disabled={!ready || saving}>
              <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save scan"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Sub-components ---------------------------------------------------------

function Intro({ mode, setMode, onStart, onUpload }) {
  const isCoil = mode === "coil";
  const steps = isCoil
    ? [
        "Lay the coil flat — a single layer, no stacked or hidden loops.",
        `Place it fully inside the ${FRAME_CM} cm × ${FRAME_CM} cm frame on screen.`,
        "Capture straight from the top, with even lighting and good contrast.",
        "The app reads the diameters and turn count from the image automatically.",
      ]
    : [
        "Lay the pipe / wire straight and flat on the floor.",
        "Put a known reference (A4 sheet or tape) flat beside it, in the same plane.",
        "Shoot from as high and straight-on as possible to limit perspective.",
        "Mark the reference, then trace the wire end-to-end; length is scaled from it.",
      ];
  return (
    <Card className="space-y-5 p-6">
      {/* Measurement-type toggle */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
        {[
          { id: "coil", label: "Flat coil", icon: CircleDot },
          { id: "straight", label: "Straight wire", icon: Ruler },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${
              mode === m.id ? "bg-white text-amber-700 shadow-sm" : "text-slate-500"
            }`}
          >
            <m.icon className="h-4 w-4" /> {m.label}
          </button>
        ))}
      </div>

      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-600">
          {isCoil ? <CircleDot className="h-6 w-6" /> : <Ruler className="h-6 w-6" />}
        </div>
        <div>
          <h2 className="font-semibold text-slate-800">
            {isCoil ? "Scan a copper coil" : "Measure a straight pipe / wire"}
          </h2>
          <p className="text-sm text-slate-500">
            {isCoil
              ? "Automatic top-view measurement using the calibration frame. Works for flat, single-layer coils."
              : "Reference-scaled measurement. Accuracy drops on long pipes due to camera perspective — weighing is more exact."}
          </p>
        </div>
      </div>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3 text-sm text-slate-600">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500">
              {i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>
      <div className="flex items-start gap-2 rounded-xl bg-amber-50/70 p-3 text-xs text-amber-700">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        {isCoil
          ? "Hidden or stacked loops can't be measured from one photo — the length below them is invisible to the camera."
          : "Perspective distorts long pipes: the far end looks smaller than the near end, so a single scale is approximate. For an exact figure, weigh the pipe instead."}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={onStart} className="w-full">
          <Camera className="h-4 w-4" /> Open camera
        </Button>
        <Button variant="outline" onClick={onUpload} className="w-full">
          <Upload className="h-4 w-4" /> Upload photo
        </Button>
      </div>
      <p className="text-center text-[11px] text-slate-400">
        On a phone, “Upload photo” also lets you take a picture or pick one from your gallery.
      </p>
    </Card>
  );
}

// SVG overlay: the dashed calibration frame plus, when present, the detected
// outer / inner circles and centre.
function FrameOverlay({ frame, detection }) {
  const { side, x, y } = frame;
  if (!side) return null;
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full">
      <rect
        x={x}
        y={y}
        width={side}
        height={side}
        fill="none"
        stroke="#fbbf24"
        strokeWidth="2"
        strokeDasharray="8 6"
        rx="4"
      />
      <text x={x + side / 2} y={y - 8} textAnchor="middle" fontSize="12" fontWeight="700" fill="#fbbf24">
        {FRAME_CM} cm
      </text>
      {detection && (
        <>
          <circle cx={detection.cx} cy={detection.cy} r={detection.outerR} fill="none" stroke="#f59e0b" strokeWidth="2.5" />
          {detection.innerR > 1 && (
            <circle cx={detection.cx} cy={detection.cy} r={detection.innerR} fill="none" stroke="#06b6d4" strokeWidth="2.5" />
          )}
          <circle cx={detection.cx} cy={detection.cy} r="3.5" fill="#ef4444" />
        </>
      )}
    </svg>
  );
}

// Straight pipe / wire — reference-calibrated trace. The operator marks a
// known-length reference (sets pixels→cm) then traces the wire end-to-end.
function StraightMeasure({ captured, capAspect, onRetake }) {
  const { user } = useAuth();
  const { viewBranchId } = useInventory();
  const { createScan } = useCopperScans();
  const { toast } = useToast();

  const [containerRef, size] = useElementSize();
  const [refId, setRefId] = useState(REFERENCES[0].id);
  const [refCm, setRefCm] = useState(REFERENCES[0].cm);
  const [refUnit, setRefUnit] = useState("cm"); // cm | mm — display unit for the reference
  const [refPts, setRefPts] = useState([]);
  const [wirePts, setWirePts] = useState([]);
  const [tool, setTool] = useState("ref");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  function pickRef(id) {
    setRefId(id);
    setRefCm(referenceById(id).cm);
  }

  function onTap(e) {
    const r = e.currentTarget.getBoundingClientRect();
    const p = { x: e.clientX - r.left, y: e.clientY - r.top };
    if (tool === "ref") {
      setRefPts((prev) => {
        const next = prev.length >= 2 ? [p] : [...prev, p];
        if (next.length === 2) setTool("wire");
        return next;
      });
    } else {
      setWirePts((prev) => [...prev, p]);
    }
  }

  const refPx =
    refPts.length === 2 ? Math.hypot(refPts[0].x - refPts[1].x, refPts[0].y - refPts[1].y) : 0;
  const pxPerCm = refPx > 0 && refCm > 0 ? refPx / refCm : 0;
  const wireCm = pxPerCm > 0 ? polylinePx(wirePts) / pxPerCm : 0;
  const lengthM = wireCm / 100;
  const ready = pxPerCm > 0 && wirePts.length >= 2;

  async function save() {
    const branchId = viewBranchId || user.branchId;
    if (!branchId) {
      toast("Select a branch first.", "error");
      return;
    }
    setSaving(true);
    try {
      await createScan({
        branchId,
        method: "trace",
        referenceType: refId,
        referenceMm: refCm * 10,
        pxPerMm: pxPerCm / 10,
        lengthM,
        image: captured,
        points: { kind: "straight", ref: refPts, wire: wirePts, refCm },
        notes: notes.trim() || null,
      });
      toast("Wire scan saved", "success");
      onRetake();
    } catch (e) {
      toast(e.message || "Could not save the scan.", "error");
    } finally {
      setSaving(false);
    }
  }

  const polyPoints = wirePts.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden p-0">
        <div
          ref={containerRef}
          onClick={onTap}
          style={{ aspectRatio: capAspect }}
          className="relative mx-auto w-full max-w-md cursor-crosshair touch-none select-none bg-slate-900"
        >
          <img src={captured} alt="Captured wire" className="h-full w-full object-cover" draggable={false} />
          <svg className="pointer-events-none absolute inset-0 h-full w-full" width={size.w} height={size.h}>
            {/* reference */}
            {refPts.length === 2 && (
              <line x1={refPts[0].x} y1={refPts[0].y} x2={refPts[1].x} y2={refPts[1].y} stroke="#10b981" strokeWidth="3" />
            )}
            {refPts.map((p, i) => (
              <circle key={`r${i}`} cx={p.x} cy={p.y} r="5" fill="#10b981" stroke="#fff" strokeWidth="1.5" />
            ))}
            {/* wire */}
            {wirePts.length >= 2 && (
              <polyline points={polyPoints} fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinejoin="round" />
            )}
            {wirePts.map((p, i) => (
              <circle key={`w${i}`} cx={p.x} cy={p.y} r="4" fill="#f59e0b" stroke="#fff" strokeWidth="1.5" />
            ))}
          </svg>
        </div>
      </Card>

      {/* Reference setup */}
      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <Ruler className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-semibold text-slate-700">Reference (sets the scale)</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={refId}
            onChange={(e) => pickRef(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 outline-none focus:border-emerald-400"
          >
            {REFERENCES.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              step={refUnit === "mm" ? "1" : "0.1"}
              min="0"
              value={refUnit === "mm" ? Math.round(refCm * 10 * 100) / 100 : refCm}
              onChange={(e) => {
                const v = Math.max(0, Number(e.target.value) || 0);
                setRefCm(refUnit === "mm" ? v / 10 : v);
              }}
              className="w-20 rounded-xl border border-slate-200 bg-white px-2 py-2 text-center text-sm font-bold text-slate-800 outline-none focus:border-emerald-400"
            />
            <select
              value={refUnit}
              onChange={(e) => setRefUnit(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm font-medium text-slate-600 outline-none focus:border-emerald-400"
            >
              <option value="cm">cm</option>
              <option value="mm">mm</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-slate-400">{referenceById(refId).hint}</p>
      </Card>

      {/* Tool toggle + edits */}
      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <ToolPill active={tool === "ref"} tone="emerald" onClick={() => setTool("ref")} done={refPts.length === 2} label={`Reference (${refPts.length}/2)`} icon={Ruler} />
          <ToolPill active={tool === "wire"} tone="amber" onClick={() => setTool("wire")} done={wirePts.length >= 2} label={`Wire (${wirePts.length})`} icon={Cable} />
        </div>
        <p className="text-xs text-slate-500">
          {tool === "ref"
            ? "Tap the two ends of the reference object."
            : "Tap along the wire from one end to the other — add points around any bends."}
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => (tool === "ref" ? setRefPts([]) : setWirePts((p) => p.slice(0, -1)))}
          >
            <Minus className="h-3.5 w-3.5" /> {tool === "ref" ? "Clear reference" : "Undo point"}
          </Button>
          {tool === "wire" && (
            <Button size="sm" variant="ghost" onClick={() => setWirePts([])}>
              <RotateCcw className="h-3.5 w-3.5" /> Clear wire
            </Button>
          )}
        </div>
      </Card>

      {/* Result */}
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-3">
          <Readout label="Scale" value={pxPerCm > 0 ? `${pxPerCm.toFixed(1)} px/cm` : "—"} />
          <Readout label="Points" value={wirePts.length} />
        </div>
        <div className="mt-4 flex items-end justify-between rounded-xl bg-amber-50 px-4 py-3">
          <span className="text-sm font-semibold text-amber-700">Wire length</span>
          <span className="text-2xl font-extrabold text-amber-700">{ready ? fmtLength(lengthM) : "—"}</span>
        </div>
        <p className="mt-2 flex items-start gap-1.5 text-[11px] text-slate-400">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
          Approximate — camera perspective makes long, angled pipes read short or long. Weigh for an exact length.
        </p>
      </Card>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        placeholder="Notes (optional)…"
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-400"
      />

      <div className="flex items-center justify-between gap-3">
        <Button variant="subtle" onClick={onRetake}>
          <RotateCcw className="h-4 w-4" /> Retake
        </Button>
        <Button variant="success" onClick={save} disabled={!ready || saving}>
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save scan"}
        </Button>
      </div>
    </div>
  );
}

function ToolPill({ active, tone, onClick, done, label, icon: Icon }) {
  const tones = {
    emerald: active ? "bg-emerald-500 text-white" : "bg-emerald-50 text-emerald-700",
    amber: active ? "bg-amber-500 text-white" : "bg-amber-50 text-amber-700",
  };
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition ${tones[tone]}`}
    >
      {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}

function Readout({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-center">
      <div className="text-lg font-extrabold text-slate-800">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  );
}
