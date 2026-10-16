import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { RELOAD_GUARD_KEY, isChunkLoadError, reloadForNewDeployment } from "./chunk-load-recovery.ts";

function createMemoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
}

describe("isChunkLoadError", () => {
  it("detects Vite dynamic import failures", () => {
    assert.equal(
      isChunkLoadError(
        new TypeError(
          "Failed to fetch dynamically imported module: https://example.com/assets/video-gallery-page-Dk9V7XUz.js",
        ),
      ),
      true,
    );
    assert.equal(isChunkLoadError("error loading dynamically imported module"), true);
    assert.equal(isChunkLoadError("Importing a module script failed."), true);
    assert.equal(isChunkLoadError(new Error("Loading chunk 42 failed")), true);
    assert.equal(isChunkLoadError(new Error("ChunkLoadError")), true);
  });

  it("ignores unrelated errors and empty values", () => {
    assert.equal(isChunkLoadError(new Error("Network request failed")), false);
    assert.equal(isChunkLoadError(null), false);
    assert.equal(isChunkLoadError(undefined), false);
    assert.equal(isChunkLoadError(42), false);
  });
});

describe("reloadForNewDeployment", () => {
  it("reloads once and records the guard timestamp", () => {
    const storage = createMemoryStorage();
    let reloads = 0;
    const triggered = reloadForNewDeployment({
      storage,
      now: 1_000,
      reload: () => {
        reloads += 1;
      },
    });
    assert.equal(triggered, true);
    assert.equal(reloads, 1);
    assert.equal(storage.getItem(RELOAD_GUARD_KEY), "1000");
  });

  it("skips the reload while inside the guard window", () => {
    const storage = createMemoryStorage({ [RELOAD_GUARD_KEY]: "1000" });
    let reloads = 0;
    const triggered = reloadForNewDeployment({
      storage,
      now: 5_000,
      reload: () => {
        reloads += 1;
      },
    });
    assert.equal(triggered, false);
    assert.equal(reloads, 0);
  });

  it("reloads again once the guard window has elapsed", () => {
    const storage = createMemoryStorage({ [RELOAD_GUARD_KEY]: "1000" });
    let reloads = 0;
    const triggered = reloadForNewDeployment({
      storage,
      now: 11_000,
      reload: () => {
        reloads += 1;
      },
    });
    assert.equal(triggered, true);
    assert.equal(reloads, 1);
  });
});
