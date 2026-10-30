// The only code that touches localStorage (see storage/CLAUDE.md). Every access is wrapped in
// try/catch: storage can be blocked or full, and then the game simply doesn't remember.

// The browser's localStorage, or null when even reading the property throws (some privacy
// settings do that).
export function browserStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

// The parsed value at `key`, or undefined when it's missing, unreadable or not JSON.
export function readJson(storage: Storage | null, key: string): unknown {
  try {
    const raw = storage?.getItem(key);
    return raw == null ? undefined : (JSON.parse(raw) as unknown);
  } catch {
    return undefined;
  }
}

// Saves `value` as JSON; false when it couldn't be saved.
export function writeJson(storage: Storage | null, key: string, value: unknown): boolean {
  try {
    if (!storage) return false;
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// Whether saves will stick: false when storage is missing, blocked or full. Writes and removes
// a probe key, so it's only for a one-off check at start-up.
export function storageWorks(storage: Storage | null = browserStorage()): boolean {
  try {
    if (!storage) return false;
    storage.setItem('cg:probe', '1');
    storage.removeItem('cg:probe');
    return true;
  } catch {
    return false;
  }
}
