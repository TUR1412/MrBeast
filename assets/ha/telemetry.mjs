function now() {
  return Date.now();
}

function randomId() {
  return `${now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function safeString(value, max = 500) {
  try {
    const s = typeof value === "string" ? value : JSON.stringify(value);
    return s.length > max ? `${s.slice(0, max)}…` : s;
  } catch {
    return "[unserializable]";
  }
}

function trySendBeacon(url, payload) {
  try {
    if (!("navigator" in globalThis)) return false;
    if (!("sendBeacon" in globalThis.navigator)) return false;
    const blob = new Blob([payload], { type: "application/json" });
    return globalThis.navigator.sendBeacon(url, blob);
  } catch {
    return false;
  }
}

async function tryFetchKeepalive(url, payload) {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      keepalive: true,
      mode: "cors",
      credentials: "omit",
    });
    return true;
  } catch {
    return false;
  }
}

export function createTelemetry(options = {}) {
  const {
    endpoint = "",
    app = "MrBeast",
    version = "",
    sampleRate = 1,
    maxQueue = 50,
    logger = null,
  } = options;

  const queue = [];
  const sessionId = randomId();

  function enabled() {
    return Boolean(endpoint);
  }

  function shouldSample() {
    if (sampleRate >= 1) return true;
    if (sampleRate <= 0) return false;
    return Math.random() < sampleRate;
  }

  function capture(name, data = {}, level = "info") {
    if (!shouldSample()) return;
    const href = typeof globalThis.location?.href === "string" ? globalThis.location.href : "";
    const event = {
      id: randomId(),
      ts: now(),
      name,
      level,
      app,
      version,
      sessionId,
      href: safeString(href, 600),
      data,
    };

    queue.push(event);
    if (queue.length > maxQueue) queue.shift();
  }

  async function flush(reason = "manual") {
    if (!enabled()) return { ok: true, skipped: true };
    if (queue.length === 0) return { ok: true, skipped: true };

    const payload = JSON.stringify({
      app,
      version,
      sessionId,
      reason,
      sentAt: now(),
      events: queue.splice(0, queue.length),
    });

    const okBeacon = trySendBeacon(endpoint, payload);
    if (okBeacon) return { ok: true, via: "beacon" };

    const okFetch = await tryFetchKeepalive(endpoint, payload);
    if (okFetch) return { ok: true, via: "fetch" };

    logger?.warn?.("telemetry.flush_failed", { endpoint });
    return { ok: false };
  }

  return {
    endpoint,
    app,
    version,
    sessionId,
    enabled,
    capture,
    flush,
  };
}
