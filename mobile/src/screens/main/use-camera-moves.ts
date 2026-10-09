/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type RefObject, useCallback, useRef } from 'react';
import type { LatLng } from '@/api/types';
import { type FitPadding, type MapHandle, MAX_ZOOM, MIN_ZOOM } from '@/map';

// A move of the camera, said from what the map tells: the fit zoom, and the zoom the camera rests at or is on its
// way to.
export type CameraWish = (fitZoom: number, zoomNow: number) => { centre?: LatLng; zoom: number };

// What is sent to the map for a move: it answers the zoom the camera is then on its way to.
type Sending = (handle: MapHandle, lowest: number, zoomNow: number) => number;

function sendingOf(wish: CameraWish): Sending {
  return (handle, lowest, zoomNow) => {
    const { centre, zoom } = wish(lowest, zoomNow);
    const within = Math.min(Math.max(zoom, lowest), MAX_ZOOM);
    handle.moveCamera({ centre, zoom: within, animated: true });
    return within;
  };
}

export interface CameraMoves {
  // Carries the move out, or keeps it until the map is ready. Of several kept, the last one counts, a fit among
  // them.
  move: (wish: CameraWish) => void;
  // To the closest view that shows all the points inside what the padding leaves of the view, and no closer than
  // `offset` above the fit zoom. Kept like a move.
  fit: (points: readonly LatLng[], padding: FitPadding, offset: number) => void;
  // The camera came to rest, the first time when the map is ready.
  rested: (zoom: number) => void;
  // The map told its fit zoom.
  fitted: (zoom: number) => void;
}

// Where a fit ends is the map's to work out. Until the camera's rest tells it, the zoom counts as the closest the
// fit may come, which is where two ends near each other bring it.
function fitOf(points: readonly LatLng[], padding: FitPadding, offset: number): Sending {
  return (handle, lowest) => {
    const closest = Math.min(lowest + offset, MAX_ZOOM);
    handle.fitTo(points, { padding, maxZoom: closest, animated: true });
    return closest;
  };
}

interface Sender {
  // Sends to the map, or keeps it until the map is ready. Of several kept, the last one counts.
  sendOrKeep: (sending: Sending) => void;
  rested: (zoom: number) => void;
  fitted: (zoom: number) => void;
}

// A native map drops what it is asked before it has opened, so what is asked before the camera's first rest is kept
// and sent then. The zoom a move counts from is changed only by what was really sent, and by the camera's rest.
function useSender(ref: RefObject<MapHandle | null>): Sender {
  const fitZoom = useRef<number | null>(null);
  const aim = useRef<number | null>(null);
  const kept = useRef<Sending | null>(null);
  const send = useCallback(
    (sending: Sending): boolean => {
      const handle = ref.current;
      const zoomNow = aim.current;
      if (handle === null || zoomNow === null) {
        return false;
      }
      // A map that tells no fit zoom is held by its own lowest zoom alone.
      aim.current = sending(handle, fitZoom.current ?? MIN_ZOOM, zoomNow);
      return true;
    },
    [ref],
  );
  const sendOrKeep = useCallback(
    (sending: Sending) => {
      kept.current = send(sending) ? null : sending;
    },
    [send],
  );
  const told = useCallback(
    (to: { current: number | null }, zoom: number) => {
      to.current = zoom;
      if (kept.current !== null && send(kept.current)) {
        kept.current = null;
      }
    },
    [send],
  );
  const rested = useCallback(
    (zoom: number) => {
      told(aim, zoom);
    },
    [told],
  );
  const fitted = useCallback(
    (zoom: number) => {
      told(fitZoom, zoom);
    },
    [told],
  );
  return { sendOrKeep, rested, fitted };
}

// Sends the screen's camera moves to the map, a fit among them, each in its turn: see `useSender`.
export function useCameraMoves(ref: RefObject<MapHandle | null>): CameraMoves {
  const { sendOrKeep, rested, fitted } = useSender(ref);
  const move = useCallback(
    (wish: CameraWish) => {
      sendOrKeep(sendingOf(wish));
    },
    [sendOrKeep],
  );
  const fit = useCallback(
    (points: readonly LatLng[], padding: FitPadding, offset: number) => {
      sendOrKeep(fitOf(points, padding, offset));
    },
    [sendOrKeep],
  );
  return { move, fit, rested, fitted };
}
