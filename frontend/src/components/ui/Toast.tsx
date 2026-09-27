import { useSyncExternalStore } from "react";

type Notice = { message: string; undo?: () => void };
let notice: Notice | null = null;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
function dismiss() {
  notice = null;
  listeners.forEach((listener) => listener());
}
export function notify(message: string, undo?: () => void) {
  notice = { message, undo };
  listeners.forEach((listener) => listener());
}

export default function Toast() {
  const current = useSyncExternalStore(
    subscribe,
    () => notice,
    () => null,
  );
  return (
    <aside className={current ? "toast" : "toast-empty"} aria-label="Notifications">
      <span role="status">{current?.message}</span>
      {current?.undo && (
        <button
          onClick={() => {
            current.undo?.();
            dismiss();
          }}
        >
          Undo
        </button>
      )}
      {current && (
        <button aria-label="Dismiss notification" onClick={dismiss}>
          ×
        </button>
      )}
    </aside>
  );
}
