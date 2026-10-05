import { type RefObject, useCallback, useRef } from 'react';
import type { LatLng } from '@/api/types';
import { type MapHandle, MAX_ZOOM, MIN_ZOOM } from '@/map';

// A move of the camera, said from what the map tells: the fit zoom, and the zoom the camera rests at or is on its
// way to.
export type CameraWish = (fitZoom: number, zoomNow: number) => { centre?: LatLng; zoom: number };

export interface CameraMoves {
  // Carries the move out, or keeps it until the map is ready. Of several kept, the last one counts.
  move: (wish: CameraWish) => void;
  // The camera came to rest, the first time when the map is ready.
  rested: (zoom: number) => void;
  // The map told its fit zoom.
  fitted: (zoom: number) => void;
}

// Sends the screen's camera moves to the map. A native map drops what it is asked before it has opened, so a move
// asked before the camera's first rest is kept and sent then. The zoom a move counts from is changed only by a move
// that was really sent, and by the camera's rest.
export function useCameraMoves(ref: RefObject<MapHandle | null>): CameraMoves {
  const fit = useRef<number | null>(null);
  const aim = useRef<number | null>(null);
  const kept = useRef<CameraWish | null>(null);
  const send = useCallback(
    (wish: CameraWish): boolean => {
      const handle = ref.current;
      const zoomNow = aim.current;
      if (handle === null || zoomNow === null) {
        return false;
      }
      // A map that tells no fit zoom is held by its own lowest zoom alone.
      const lowest = fit.current ?? MIN_ZOOM;
      const { centre, zoom } = wish(lowest, zoomNow);
      const within = Math.min(Math.max(zoom, lowest), MAX_ZOOM);
      aim.current = within;
      handle.moveCamera({ centre, zoom: within, animated: true });
      return true;
    },
    [ref],
  );
  const sendKept = useCallback(() => {
    if (kept.current !== null && send(kept.current)) {
      kept.current = null;
    }
  }, [send]);
  const move = useCallback(
    (wish: CameraWish) => {
      kept.current = send(wish) ? null : wish;
    },
    [send],
  );
  const rested = useCallback(
    (zoom: number) => {
      aim.current = zoom;
      sendKept();
    },
    [sendKept],
  );
  const fitted = useCallback(
    (zoom: number) => {
      fit.current = zoom;
      sendKept();
    },
    [sendKept],
  );
  return { move, rested, fitted };
}
