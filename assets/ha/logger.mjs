const LEVELS = /** @type {const} */ (["debug", "info", "warn", "error", "silent"]);

function levelToRank(level) {
  const idx = LEVELS.indexOf(level);
  return idx === -1 ? LEVELS.indexOf("info") : idx;
}

function nowIso() {
  return new Date().toISOString();
}

function safeJsonStringify(value) {
  const seen = new WeakSet();
  return JSON.stringify(value, (key, val) => {
    if (typeof val === "object" && val !== null) {
      if (seen.has(val)) return "[Circular]";
      seen.add(val);
    }
    if (typeof val === "bigint") return String(val);
    if (val instanceof Error) {
      return {
        name: val.name,
        message: val.message,
        stack: val.stack,
      };
    }
    return val;
  });
}

function buildConsoleMethod(level) {
  switch (level) {
    case "debug":
      return console.debug?.bind(console) ?? console.log.bind(console);
    case "info":
      return console.info?.bind(console) ?? console.log.bind(console);
    case "warn":
      return console.warn.bind(console);
    case "error":
      return console.error.bind(console);
    default:
      return console.log.bind(console);
  }
}

export function createConsoleTransport() {
  return {
    name: "console",
    write(entry) {
      const fn = buildConsoleMethod(entry.level);
      const prefix = `[${entry.ts}] ${entry.level.toUpperCase()}${entry.scope ? ` ${entry.scope}` : ""}`;
      if (entry.data === undefined) {
        fn(prefix, entry.message);
        return;
      }
      fn(prefix, entry.message, entry.data);
    },
  };
}

export function createLogger(options = {}) {
  const {
    level = "info",
    scope = "",
    context = {},
    transports = [createConsoleTransport()],
  } = options;

  const minRank = levelToRank(level);
  const base = { ...context };

  function emit(entry) {
    for (const transport of transports) {
      try {
        transport.write(entry);
      } catch {
        // avoid recursive logging failures
      }
    }
  }

  function log(lvl, message, data) {
    const rank = levelToRank(lvl);
    if (rank < minRank || minRank === levelToRank("silent")) return;
    emit({
      ts: nowIso(),
      level: lvl,
      scope,
      message: String(message ?? ""),
      data: data === undefined ? undefined : data,
      json: data === undefined ? undefined : safeJsonStringify(data),
      context: base,
    });
  }

  return {
    level,
    scope,
    context: base,
    debug(message, data) {
      log("debug", message, data);
    },
    info(message, data) {
      log("info", message, data);
    },
    warn(message, data) {
      log("warn", message, data);
    },
    error(message, data) {
      log("error", message, data);
    },
    child(childOptions = {}) {
      const nextScope = [scope, childOptions.scope].filter(Boolean).join(":");
      return createLogger({
        level,
        transports,
        scope: nextScope,
        context: { ...base, ...(childOptions.context ?? {}) },
      });
    },
  };
}

