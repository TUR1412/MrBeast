import test from "node:test";
import assert from "node:assert/strict";

import { createLogger } from "../assets/ha/logger.mjs";

test("logger respects min level and emits structured entries", () => {
  const entries = [];
  const transport = {
    name: "test",
    write(entry) {
      entries.push(entry);
    },
  };

  const logger = createLogger({
    level: "warn",
    scope: "root",
    transports: [transport],
  });

  logger.debug("d1");
  logger.info("i1");
  logger.warn("w1", { a: 1 });
  logger.error("e1", { b: 2 });

  assert.equal(entries.length, 2);
  assert.equal(entries[0].level, "warn");
  assert.equal(entries[0].scope, "root");
  assert.equal(entries[0].message, "w1");
  assert.equal(typeof entries[0].ts, "string");
  assert.deepEqual(entries[0].data, { a: 1 });
  assert.equal(typeof entries[0].json, "string");

  assert.equal(entries[1].level, "error");
  assert.equal(entries[1].message, "e1");
});

test("logger.child composes scope and merges context", () => {
  const entries = [];
  const transport = { name: "test", write: (e) => entries.push(e) };

  const root = createLogger({
    level: "debug",
    scope: "a",
    context: { a: 1 },
    transports: [transport],
  });
  const child = root.child({ scope: "b", context: { b: 2 } });

  child.info("hello", { ok: true });
  assert.equal(entries.length, 1);
  assert.equal(entries[0].scope, "a:b");
  assert.deepEqual(entries[0].context, { a: 1, b: 2 });
});

test("logger never throws when serializing circular objects", () => {
  const entries = [];
  const transport = { name: "test", write: (e) => entries.push(e) };
  const logger = createLogger({ level: "debug", transports: [transport] });

  const obj = { a: 1 };
  obj.self = obj;

  assert.doesNotThrow(() => logger.info("circular", obj));
  assert.equal(entries.length, 1);
  assert.equal(typeof entries[0].json, "string");
  assert.ok(entries[0].json.includes("Circular"));
});

