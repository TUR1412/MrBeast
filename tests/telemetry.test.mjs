import test from "node:test";
import assert from "node:assert/strict";

import { createTelemetry } from "../assets/ha/telemetry.mjs";

test("telemetry capture keeps a bounded queue and flush skips without endpoint", async () => {
  const telemetry = createTelemetry({
    endpoint: "",
    app: "MrBeast",
    version: "test",
    maxQueue: 3,
    sampleRate: 1,
  });

  telemetry.capture("e1", { a: 1 });
  telemetry.capture("e2", { a: 2 });
  telemetry.capture("e3", { a: 3 });
  telemetry.capture("e4", { a: 4 });

  const res = await telemetry.flush("test");
  assert.equal(res.ok, true);
  assert.equal(res.skipped, true);
});

test("telemetry.enabled reflects endpoint presence", () => {
  const a = createTelemetry({ endpoint: "" });
  const b = createTelemetry({ endpoint: "https://example.com/ingest" });
  assert.equal(a.enabled(), false);
  assert.equal(b.enabled(), true);
});

