import { useEffect, useState } from "react";

/**
 * Trailing-edge debounce. The editor pickers search server-side on every
 * keystroke, so without this a five-character code fires five queries and the
 * responses race each other into the dropdown.
 */
export const useDebouncedValue = <T>(value: T, delay = 250): T => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};
