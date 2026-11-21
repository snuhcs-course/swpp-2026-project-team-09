/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ChatBubble } from '@/features/assistant/use-chat';
import type { LatLng } from '@/api/types';
import { inView, type MapCamera, type Point } from '@/map';

// A mark of the answer pressed on the map, whose card stands attached to it: its id, and its point in the stage.
export interface OpenedMark {
  id: string;
  at: Point;
}

export interface MarkOpening {
  mark: OpenedMark | null;
  openMark: (mark: OpenedMark) => void;
  closeMark: () => void;
}

// One mark's card at a time. A new bubble in the conversation, or the frame left, closes it.
export function useOpenedMark(bubbles: readonly ChatBubble[], framed: boolean): MarkOpening {
  const [mark, setMark] = useState<OpenedMark | null>(null);
  const last = bubbles.at(-1)?.id ?? null;
  const [seen, setSeen] = useState({ last, framed });
  if (seen.last !== last || seen.framed !== framed) {
    setSeen({ last, framed });
    setMark(null);
  }
  return {
    mark,
    openMark: setMark,
    closeMark: () => {
      setMark(null);
    },
  };
}

// Where a position lies in the stage, under the status bar `top` high: the map's view takes the status bar too. Null
// until the camera and the stage are known.
export function stagePointOf(
  position: LatLng,
  camera: MapCamera | null,
  stage: { width: number; height: number } | null,
  top: number,
): Point | null {
  if (camera === null || stage === null) {
    return null;
  }
  const { x, y } = inView(position, camera, { width: stage.width, height: stage.height + top });
  return { x, y: y - top };
}

// The press on a mark of a Plan that has a card: its card opens at the mark's point in the stage.
export function useMarkOpening(
  openMark: (mark: OpenedMark) => void,
  camera: MapCamera | null,
  stage: { width: number; height: number } | null,
): (id: string, position: LatLng) => void {
  const { top } = useSafeAreaInsets();
  return (id, position) => {
    const at = stagePointOf(position, camera, stage, top);
    if (at !== null) {
      openMark({ id, at });
    }
  };
}
