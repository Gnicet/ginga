import { useState, useEffect } from "react";
import { apiRequest } from "../roomRequest";
export function useMediaSource(source?: string) {
  const [result, set] = useState<{ key: string; src: string }>();
  useEffect(() => {
    if (!source?.startsWith("/api/mural/midia/")) return;
    let active = true;
    apiRequest(source)
      .then(async (r) => {
        if (r.ok) {
          const data = await r.json();
          if (active) set({ key: source, src: data.src });
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [source]);
  return source?.startsWith("/api/mural/midia/")
    ? result?.key === source
      ? result.src
      : undefined
    : source;
}
