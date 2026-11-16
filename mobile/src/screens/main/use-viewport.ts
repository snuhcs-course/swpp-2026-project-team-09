/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useEffect, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { viewportOf } from '@/features/assistant/study-area';
import type { ChatSheetControl } from './chat-sheet';
import type { Room } from './layout';
import type { MainMap } from './use-main-map';

// Keeps the visible area of the map at rest for every request's context ("이 근처", P02 ticket 23): the map's view is
// the stage and the status bar over it, and the area is what the status bar leaves. None before the map is ready or
// the stage is laid out.
export function useViewport({ setViewport }: Pick<ChatSheetControl, 'setViewport'>, map: MainMap, room: Room): void {
  const { top } = useSafeAreaInsets();
  const { camera } = map;
  const { stage } = room;
  const viewport = useMemo(
    () =>
      camera === null || stage === null
        ? null
        : viewportOf(camera, { width: stage.width, height: stage.height + top }, top),
    [camera, stage, top],
  );
  useEffect(() => {
    setViewport(viewport);
  }, [setViewport, viewport]);
}
