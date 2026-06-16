import { useEffect, useState } from "react";

// Simulates an async fetch so pages can show polished loading states.
export function usePageLoad(delay = 550) {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return loading;
}
