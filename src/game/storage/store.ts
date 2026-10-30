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
