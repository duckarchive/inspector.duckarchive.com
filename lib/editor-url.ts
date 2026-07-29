/**
 * Keep the editor catalog pages' filter cascade (?archive=…&fond=…&inventory=…&edit=…)
 * in the address bar so a refresh or a shared link restores the same view. Uses
 * replaceState — no navigation, no scroll, no history spam. The same params are read
 * back on mount by each page (deep links from the actions dashboard use them too).
 */
export const syncEditorUrl = (params: Record<string, string | null>): void => {
  const sp = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(params)) {
    if (value) sp.set(key, value);
    else sp.delete(key);
  }
  const qs = sp.toString();
  window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
};
