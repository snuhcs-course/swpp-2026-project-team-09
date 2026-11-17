/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MapCamera } from '@/map';
import type { ChatSheetControl } from './chat-sheet';
import type { MainMap } from './use-main-map';

// The camera the everyday map had when the answer frame was shown, to go back to once the frame's own way out was
// taken; null for none.
export interface CameraBack {
  to: MapCamera | null;
  done: () => void;
}

// The answer frame's own way out, ✕, Android's back button or a card's "닫기", brings the map back to where the
// everyday map was when the frame was shown: an answer's camera does not stay behind it. Leaving by a map button or
// by route guidance is left to them, whose own moves follow. The move itself is `useReturnedCamera`'s.
export function useCameraBack(
  chat: ChatSheetControl,
  camera: MapCamera | null,
): {
  chat: ChatSheetControl;
  back: CameraBack;
} {
  const everyday = useRef<MapCamera | null>(null);
  const shown = useRef(false);
  const [to, setTo] = useState<MapCamera | null>(null);
  const { framed, hide } = chat;
  useEffect(() => {
    if (framed && !shown.current) {
      everyday.current = camera;
    }
    shown.current = framed;
  }, [framed, camera]);
  const leave = useCallback((): void => {
    hide();
    setTo(everyday.current);
  }, [hide]);
  const done = useCallback((): void => {
    setTo(null);
  }, []);
  return { chat: { ...chat, hide: leave }, back: { to, done } };
}

// Sends the camera back once the frame is gone. It is called after the everyday map's limits (`useEverydayLimits`),
// whose glide in from an answer's camera further out than the everyday map allows would otherwise come after it.
export function useReturnedCamera({ to, done }: CameraBack, framed: boolean, { moveTo }: MainMap): void {
  useEffect(() => {
    if (to !== null && !framed) {
      moveTo(to);
      done();
    }
  }, [to, framed, moveTo, done]);
}
