import { useCallback, useMemo, useSyncExternalStore } from "react";

const prefix = "react-events:visitor:";
const listLimits = { saved: 100, plan: 100, viewed: 8, searches: 5 } as const;
type VisitorListKey = keyof typeof listLimits;
type PreferenceKey = VisitorListKey | "theme" | "view" | "welcome-dismissed";
const memory = new Map<PreferenceKey, string>();
const temporary = new Set<PreferenceKey>();
const listeners = new Map<PreferenceKey, Set<() => void>>();

function read(key: PreferenceKey): string | null {
  // A failed write must take precedence over the older value still persisted in storage.
  if (temporary.has(key)) return memory.get(key) ?? null;
  try {
    return localStorage.getItem(prefix + key);
  } catch {
    return memory.get(key) ?? null;
  }
}

export function setPreference(key: PreferenceKey, value: string) {
  if (read(key) === value) return;
  memory.set(key, value);
  try {
    localStorage.setItem(prefix + key, value);
    temporary.delete(key);
  } catch {
    temporary.add(key);
  }
  // Native storage events do not fire in the writing tab, so notify its subscribers directly.
  listeners.get(key)?.forEach((listener) => listener());
}

function onStorage(event: StorageEvent) {
  for (const [key, subscribers] of listeners) {
    if (event.key != null && event.key !== prefix + key) continue;
    // Another tab's persisted update takes precedence over an older memory fallback.
    memory.delete(key);
    temporary.delete(key);
    subscribers.forEach((listener) => listener());
  }
}

function subscribe(key: PreferenceKey, listener: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  let subscribers = listeners.get(key);
  if (!subscribers) {
    subscribers = new Set();
    listeners.set(key, subscribers);
  }
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
    if (subscribers.size === 0) listeners.delete(key);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function usePreference(key: PreferenceKey, fallback: string) {
  const observe = useCallback((listener: () => void) => subscribe(key, listener), [key]);
  // Keep snapshots as stable strings; useVisitorList memoizes parsed arrays separately.
  return useSyncExternalStore(
    observe,
    () => read(key) ?? fallback,
    () => fallback,
  );
}

function normalizeList(key: VisitorListKey, value: unknown): string[] {
  return Array.isArray(value)
    ? [
        ...new Set(
          value.filter(
            (item): item is string =>
              typeof item === "string" &&
              item.trim().length > 0 &&
              item.length <= (key === "searches" ? 200 : 256),
          ),
        ),
      ].slice(0, listLimits[key])
    : [];
}

function parseList(key: VisitorListKey, raw: string | null): string[] {
  try {
    return normalizeList(key, JSON.parse(raw ?? "[]"));
  } catch {
    return [];
  }
}

export function useVisitorList(key: VisitorListKey) {
  const raw = usePreference(key, "[]");
  return useMemo(() => parseList(key, raw), [key, raw]);
}

export function updateVisitorList(key: VisitorListKey, value: string, include: boolean) {
  const rest = parseList(key, read(key)).filter((item) => item !== value);
  const next = normalizeList(key, include ? [value, ...rest] : rest);
  setPreference(key, JSON.stringify(next));
}

export function removeVisitorItems(key: VisitorListKey, values: readonly string[]) {
  const removed = new Set(values);
  // Read the latest list so additions made since the UI rendered are retained.
  setPreference(
    key,
    JSON.stringify(parseList(key, read(key)).filter((item) => !removed.has(item))),
  );
}
