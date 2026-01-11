import { createLogger } from "./logger.mjs";
import { createTelemetry } from "./telemetry.mjs";
import { installGlobalErrorBoundary } from "./error-boundary.mjs";
import { startPerformanceMonitoring } from "./perf.mjs";

function meta(name) {
  return document.querySelector(`meta[name="${name}"]`)?.getAttribute("content") ?? "";
}

function detectVersion() {
  const version = meta("app:version");
  if (version) return version;
  const build = meta("build:version");
  if (build) return build;
  return "";
}

function detectTelemetryEndpoint() {
  return meta("ha:telemetry:endpoint");
}

function detectLogLevel() {
  const fromStorage = localStorage.getItem("ha:logLevel");
  if (fromStorage) return fromStorage;
  return "info";
}

function registerServiceWorker({ logger, telemetry, version }) {
  if (!("serviceWorker" in navigator)) return;
  if (meta("ha:sw:disabled") === "1") return;

  const url = version ? `sw.js?v=${encodeURIComponent(version)}` : "sw.js";
  navigator.serviceWorker
    .register(url)
    .then((reg) => {
      logger?.info?.("sw.registered", { scope: reg.scope });
      telemetry?.capture?.("sw.registered", { scope: reg.scope }, "info");
    })
    .catch((err) => {
      logger?.warn?.("sw.register_failed", { message: err?.message });
      telemetry?.capture?.("sw.register_failed", { message: err?.message }, "warn");
    });
}

function safeString(value, max = 800) {
  try {
    const s = typeof value === "string" ? value : JSON.stringify(value);
    return s.length > max ? `${s.slice(0, max)}…` : s;
  } catch {
    return "[unserializable]";
  }
}

function instrumentConsole({ telemetry }) {
  const original = {
    error: console.error?.bind(console),
    warn: console.warn?.bind(console),
  };

  if (original.error) {
    console.error = (...args) => {
      telemetry?.capture?.(
        "console.error",
        { args: args.map((a) => safeString(a, 300)) },
        "error",
      );
      original.error(...args);
    };
  }

  if (original.warn) {
    console.warn = (...args) => {
      telemetry?.capture?.(
        "console.warn",
        { args: args.map((a) => safeString(a, 300)) },
        "warn",
      );
      original.warn(...args);
    };
  }

  return () => {
    if (original.error) console.error = original.error;
    if (original.warn) console.warn = original.warn;
  };
}

const version = detectVersion();
const logger = createLogger({
  level: detectLogLevel(),
  scope: "ha",
  context: { version },
});

const telemetry = createTelemetry({
  endpoint: detectTelemetryEndpoint(),
  app: "MrBeast",
  version,
  sampleRate: 1,
  logger,
});

installGlobalErrorBoundary({
  logger,
  telemetry,
  showOverlay: true,
});

startPerformanceMonitoring({
  logger,
  telemetry,
});

instrumentConsole({ telemetry });
registerServiceWorker({ logger, telemetry, version });

window.__HA__ = Object.freeze({
  version,
  logger,
  telemetry,
});
