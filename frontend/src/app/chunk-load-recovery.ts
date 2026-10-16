// Recovery helpers for "Failed to fetch dynamically imported module" errors.
//
// A Vite production build emits content-hashed chunk filenames. When a new
// version is deployed, a browser that still holds an older entry bundle (for
// example a long-lived tab) will request a chunk hash that no longer exists on
// the server. The request 404s and the dynamic import rejects, surfacing as
// "Failed to fetch dynamically imported module". A single reload fetches the
// fresh HTML, entry bundle, and chunk names.

const CHUNK_LOAD_ERROR_PATTERNS: readonly RegExp[] = [
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /dynamically imported module/i,
  /importing a module script failed/i,
  /loading chunk \d+ failed/i,
  /chunkloaderror/i,
];

export const RELOAD_GUARD_KEY = "grok2api:chunk-load-reload-at";
const RELOAD_GUARD_WINDOW_MS = 10_000;

type GuardStorage = Pick<Storage, "getItem" | "setItem">;

export interface ReloadGuardOptions {
  storage?: GuardStorage | null;
  now?: number;
}

/** True when the error looks like a stale/missing code-split chunk. */
export function isChunkLoadError(error: unknown): boolean {
  if (error == null) {
    return false;
  }
  const message =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : typeof error === "string"
        ? error
        : String(error);
  return CHUNK_LOAD_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

function resolveStorage(storage: ReloadGuardOptions["storage"]): GuardStorage | null {
  if (storage !== undefined) {
    return storage;
  }
  return typeof window === "undefined" ? null : window.sessionStorage;
}

function isWithinGuardWindow(storage: GuardStorage | null, now: number): boolean {
  if (!storage) {
    return false;
  }
  const stored = storage.getItem(RELOAD_GUARD_KEY);
  const last = stored === null ? Number.NEGATIVE_INFINITY : Number(stored);
  return Number.isFinite(last) && now - last < RELOAD_GUARD_WINDOW_MS;
}

/**
 * Read-only check: whether a recovery reload is still allowed. Returns false
 * when a reload was already triggered within the guard window, which prevents a
 * reload loop when the chunk is genuinely missing from the current deployment.
 */
export function shouldReloadForNewDeployment(options: ReloadGuardOptions = {}): boolean {
  return !isWithinGuardWindow(resolveStorage(options.storage), options.now ?? Date.now());
}

export interface ReloadOptions extends ReloadGuardOptions {
  reload?: () => void;
}

/**
 * Reload the page once so the client can pick up a newly deployed bundle.
 * Records a timestamp so repeated failures within the guard window are ignored.
 * Returns whether a reload was triggered.
 */
export function reloadForNewDeployment(options: ReloadOptions = {}): boolean {
  const storage = resolveStorage(options.storage);
  const now = options.now ?? Date.now();
  const reload = options.reload ?? (() => window.location.reload());

  if (isWithinGuardWindow(storage, now)) {
    return false;
  }
  storage?.setItem(RELOAD_GUARD_KEY, String(now));
  reload();
  return true;
}
