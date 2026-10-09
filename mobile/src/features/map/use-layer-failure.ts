// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { useEffect, useRef } from 'react';
import { useToast } from '@/design-system';

// Says `words` once when a fetch of a layer of the map fails while the layer is `on`. A failure from before the layer
// was turned on, such as the menu panel's, is not the layer's.
export function useLayerFailureToast(on: boolean, failedAt: number, words: string): void {
  const showToast = useToast();
  const seen = useRef(failedAt);
  useEffect(() => {
    if (on && failedAt > seen.current) {
      showToast(words);
    }
    seen.current = failedAt;
  }, [on, failedAt, words, showToast]);
}
