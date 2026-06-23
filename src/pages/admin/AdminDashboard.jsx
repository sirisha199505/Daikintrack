import { memo, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Boxes,
  PackageX,
  Building2,
  CheckCircle2,
  PieChart as PieIcon,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useInventory } from "../../context/InventoryContext";
import { usePageLoad } from "../../hooks/usePageLoad";
import GreetingHeader from "../../components/layout/GreetingHeader";
import DonutChart from "../../components/charts/DonutChart";
import WarehouseStackChart from "../../components/charts/WarehouseStackChart";
import { Card, Skeleton, EmptyState } from "../../components/ui/Primitives";
import { num, roleLabel } from "../../utils/format";
import { shade } from "../../utils/color";

// Framer Motion handles only the card swap (enter/exit); the swipe gesture
// itself is a raw Pointer Events implementation in HubCarousel.
const cardVariants = {
  enter: (dir) => ({ x: dir >= 0 ? 90 : -90, opacity: 0, scale: 0.9, rotate: dir >= 0 ? 5 : -5 }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { type: "spring", stiffness: 180, damping: 20 },
  },
  exit: (dir) => ({
    x: dir >= 0 ? -90 : 90,
    opacity: 0,
    scale: 0.9,
    rotate: dir >= 0 ? -5 : 5,
    transition: { duration: 0.2 },
  }),
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const { statsFor, categoryBreakdown, branches, categories } = useInventory();
  const loading = usePageLoad();
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(0);

  const overall = useMemo(() => statsFor(null), [statsFor]);
  const cats = useMemo(() => categoryBreakdown(null), [categoryBreakdown]);

  const hub = branches[index] || branches[0];
  const hubStats = useMemo(() => statsFor(hub?.id), [statsFor, hub]);
  const hubShare = overall.totalStock
    ? Math.round((hubStats.totalStock / overall.totalStock) * 100)
    : 0;

  // Per-hub category breakdown for the in-card donut (stock) and pie (low stock).
  const hubCats = useMemo(() => categoryBreakdown(hub?.id), [categoryBreakdown, hub]);
  const hubInStock = useMemo(
    () =>
      hubCats
        .filter((c) => c.value > 0)
        .map((c) => ({ name: c.name, value: c.value, color: c.color })),
    [hubCats]
  );
  const hubLow = useMemo(
    () =>
      hubCats
        .filter((c) => c.lowValue > 0)
        .map((c) => ({ name: c.name, value: c.lowValue, color: c.color })),
    [hubCats]
  );

  // In Stock — distribution by category (across all warehouses).
  const inStockData = useMemo(
    () =>
      cats
        .filter((c) => c.value > 0)
        .map((c) => ({ name: c.name, value: c.value, color: c.color })),
    [cats]
  );
  // Low Stock — stacked bars: X-axis = branches, each bar split by category.
  const lowRows = useMemo(
    () =>
      branches.map((b) => {
        const row = { id: b.id, name: b.name };
        categoryBreakdown(b.id).forEach((c) => {
          row[c.id] = c.lowValue;
        });
        return row;
      }),
    [branches, categoryBreakdown]
  );
  // Only stack categories that actually have low stock somewhere.
  const lowStackCats = useMemo(
    () => categories.filter((c) => lowRows.some((r) => (r[c.id] || 0) > 0)),
    [categories, lowRows]
  );

  function goTo(i, d) {
    if (!branches.length) return;
    setDir(d);
    setIndex(((i % branches.length) + branches.length) % branches.length);
  }
  const next = () => goTo(index + 1, 1);
  const prev = () => goTo(index - 1, -1);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <GreetingHeader name={user.name} subtitle={roleLabel(user.role)} />

      {/* ===== Stock Overview: In Stock (Donut) + Low Stock (Bars) =====
          Memoized so tapping a hub tab below never re-renders (and thus never
          re-animates / "refreshes") these overall charts. */}
      <StockOverview
        inStockData={inStockData}
        totalStock={overall.totalStock}
        lowStock={overall.lowStock}
        lowRows={lowRows}
        lowStackCats={lowStackCats}
      />

      {/* Hub tabs — small pills that wrap to fit; never scroll sideways */}
      <div className="flex flex-wrap gap-1.5">
        {branches.map((b, i) => {
          const active = index === i;
          return (
            <button
              key={b.id}
              onClick={() => goTo(i, i >= index ? 1 : -1)}
              style={
                active
                  ? { background: b.color, boxShadow: `0 8px 20px ${b.color}55` }
                  : undefined
              }
              className={`relative flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                active
                  ? "text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: active ? "#fff" : b.color }}
              />
              {b.name}
            </button>
          );
        })}
      </div>

      {/* Swipeable hub detail card */}
      {hub && (
        <HubCarousel
          hub={hub}
          hubStats={hubStats}
          hubShare={hubShare}
          hubIndex={index + 1}
          total={branches.length}
          dir={dir}
          inStockData={hubInStock}
          lowData={hubLow}
          onNext={next}
          onPrev={prev}
        />
      )}
    </div>
  );
}

// Overall In Stock + Low Stock charts. Memoized: re-renders only when its own
// data changes, never when the hub carousel index below changes.
const StockOverview = memo(function StockOverview({
  inStockData,
  totalStock,
  lowStock,
  lowRows,
  lowStackCats,
}) {
  return (
    <div className="grid grid-cols-1 gap-6 md:auto-rows-fr md:grid-cols-2">
      {/* In Stock — Donut */}
      <Card className="flex h-full flex-col p-5">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
            <Boxes className="h-4 w-4 text-daikin-600" /> In Stock
          </h3>
          <p className="text-xs text-slate-400">Total available stock</p>
        </div>
        {inStockData.length ? (
          <div className="mt-2 flex flex-1 items-center">
            <DonutChart
              data={inStockData}
              centerValue={num(totalStock)}
              centerLabel="in stock"
              unit="units"
              showTooltip
            />
          </div>
        ) : (
          <div className="grid flex-1 place-items-center">
            <EmptyState icon={PackageX} title="No stock available" />
          </div>
        )}
      </Card>

      {/* Low Stock — Bars */}
      <Card className="flex h-full flex-col p-5">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
            <PieIcon className="h-4 w-4 text-red-500" /> Low Stock
          </h3>
          <p className="text-xs text-slate-400">Low-stock units by store &amp; category</p>
        </div>
        {lowStock > 0 ? (
          <div className="mt-2 flex flex-1 items-center">
            <WarehouseStackChart rows={lowRows} categories={lowStackCats} height={220} />
          </div>
        ) : (
          <div className="grid flex-1 place-items-center">
            <EmptyState
              icon={CheckCircle2}
              title="All healthy"
              subtitle="No products are running low right now."
            />
          </div>
        )}
      </Card>
    </div>
  );
});

function HubCarousel({
  hub,
  hubStats,
  hubShare,
  hubIndex,
  total,
  dir,
  inStockData,
  lowData,
  onNext,
  onPrev,
}) {
  const dragRef = useRef(null);
  const startX = useRef(null);
  const dragging = useRef(false);
  // Keep the latest handler identities so we can detach on unmount.
  const moveRef = useRef(null);
  const upRef = useRef(null);

  useEffect(
    () => () => {
      if (moveRef.current) document.removeEventListener("pointermove", moveRef.current);
      if (upRef.current) document.removeEventListener("pointerup", upRef.current);
    },
    []
  );

  function onMove(e) {
    if (!dragging.current || startX.current == null) return;
    const x = e.clientX ?? e.touches?.[0]?.clientX;
    if (x == null) return;
    const delta = x - startX.current;
    const el = dragRef.current;
    if (el) {
      el.style.transition = "none";
      el.style.transform = `translateX(${delta}px) rotate(${delta * 0.03}deg)`;
    }
  }

  function onUp(e) {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    moveRef.current = null;
    upRef.current = null;
    const x = e.clientX ?? e.changedTouches?.[0]?.clientX ?? startX.current;
    const delta = (x ?? 0) - (startX.current ?? 0);
    dragging.current = false;
    const el = dragRef.current;
    if (el) {
      // Spring back to rest; if the swipe was decisive we swap cards.
      el.style.transition = "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)";
      el.style.transform = "";
    }
    if (Math.abs(delta) > 50) {
      if (delta < 0) onNext();
      else onPrev();
    }
  }

  function onPointerDown(e) {
    startX.current = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    dragging.current = true;
    moveRef.current = onMove;
    upRef.current = onUp;
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }

  return (
    <div className="relative">
      <AnimatePresence custom={dir} mode="wait" initial={false}>
        <motion.div
          key={hub.id}
          custom={dir}
          variants={cardVariants}
          initial="enter"
          animate="center"
          exit="exit"
        >
          <div
            ref={dragRef}
            onPointerDown={onPointerDown}
            className="relative cursor-grab touch-none select-none overflow-hidden rounded-2xl p-5 text-slate-800 active:cursor-grabbing sm:p-6"
            style={{
              background: `linear-gradient(135deg, ${shade(hub.color, 0.62)} 0%, ${shade(hub.color, 0.8)} 100%)`,
              boxShadow: `0 16px 40px -18px ${hub.color}66, inset 0 1px 0 rgba(255,255,255,0.5)`,
            }}
          >
            <div
              className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full"
              style={{ backgroundColor: hub.color, opacity: 0.06 }}
            />
            <div className="relative flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="grid h-11 w-11 place-items-center rounded-xl text-white"
                  style={{ backgroundColor: hub.color }}
                >
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{hub.name}</h3>
                  <p className="text-sm text-slate-500">
                    {hub.location}
                    {hub.manager ? ` · ${hub.manager}` : ""}
                  </p>
                </div>
              </div>
              <div className="text-right text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Hub {hubIndex}/{total}
              </div>
            </div>

            <div className="relative mt-4 grid grid-cols-2 gap-3">
              {/* In Stock — donut */}
              <div className="rounded-xl bg-white/40 p-3 ring-1 ring-white/50">
                <div className="mb-1 text-center text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                  In Stock
                </div>
                {inStockData.length ? (
                  <DonutChart
                    data={inStockData}
                    height={150}
                    centerValue={num(hubStats.totalStock)}
                    centerLabel="units"
                    unit="units"
                    showTooltip
                  />
                ) : (
                  <div className="grid h-[150px] place-items-center text-sm text-slate-400">
                    No stock
                  </div>
                )}
              </div>

              {/* Low Stock — pie */}
              <div className="rounded-xl bg-white/40 p-3 ring-1 ring-white/50">
                <div className="mb-1 text-center text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                  Low Stock ({num(hubStats.lowStock)})
                </div>
                {lowData.length ? (
                  <DonutChart data={lowData} innerRadius={0} height={150} unit="units" showTooltip />
                ) : (
                  <div className="grid h-[150px] place-items-center text-center text-sm text-slate-400">
                    All healthy
                  </div>
                )}
              </div>
            </div>

            <div className="relative mt-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: hub.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${hubShare}%` }}
                  transition={{ duration: 0.6 }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-slate-500">
                <span>{hubShare}% of total inventory</span>
                <span className="hidden sm:inline">← swipe or tap a hub →</span>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-28 w-full" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-56 w-full" />
    </div>
  );
}
