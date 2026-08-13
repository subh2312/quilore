import { useEffect } from 'react';
import { useObserve } from 'expo-observe';

/**
 * Calls `markInteractive()` once on mount for the current screen/route.
 * Place on each startup landing screen so TTI is recorded whichever entry wins.
 */
export function useMarkObserveInteractive() {
  const { markInteractive } = useObserve();

  useEffect(() => {
    markInteractive();
  }, [markInteractive]);
}
