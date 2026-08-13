import { useEffect } from 'react';
import { useObserve } from 'expo-observe';

/**
 * Records Time to Interactive for the current route (and app-wide on first call).
 * Safe to call from every startup landing screen — only the first call per session/route counts.
 */
export function useMarkObserveInteractive() {
  const { markInteractive } = useObserve();

  useEffect(() => {
    markInteractive();
  }, [markInteractive]);
}
