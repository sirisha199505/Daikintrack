import { useEffect, useState } from "react";

// State that mirrors itself into localStorage. On first mount it reads the
// stored value (falling back to `initial`), then writes back on every change.
export function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full or unavailable — keep state in memory only */
    }
  }, [key, value]);

  return [value, setValue];
}
