function navEntry() {
  const [nav] = performance.getEntriesByType?.("navigation") ?? [];
  return nav ?? null;
}

function onPageFinalized(cb) {
  let done = false;
  function run(reason) {
    if (done) return;
    done = true;
    cb(reason);
  }
  window.addEventListener("pagehide", () => run("pagehide"), { once: true });
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.visibilityState === "hidden") run("hidden");
    },
    { once: true },
  );
}

export function startPerformanceMonitoring(options = {}) {
  const { logger = null, telemetry = null } = options;

  const vitals = {
    ttfb: null,
    fcp: null,
    lcp: null,
    cls: 0,
  };

  const nav = navEntry();
  if (nav) {
    vitals.ttfb = Math.max(0, nav.responseStart ?? 0);
  }

  try {
    const paintObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === "first-contentful-paint") {
          vitals.fcp = entry.startTime;
        }
      }
    });
    paintObserver.observe({ type: "paint", buffered: true });
  } catch {
    // ignore
  }

  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) vitals.lcp = last.startTime;
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
  } catch {
    // ignore
  }

  try {
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) vitals.cls += entry.value;
      }
    });
    clsObserver.observe({ type: "layout-shift", buffered: true });
  } catch {
    // ignore
  }

  onPageFinalized((reason) => {
    const payload = {
      reason,
      ...vitals,
      cls: Number(vitals.cls.toFixed(4)),
    };
    logger?.info?.("perf.vitals", payload);
    telemetry?.capture?.("perf.vitals", payload, "info");
    telemetry?.flush?.("perf.vitals");
  });

  return vitals;
}

