/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useEffect, useMemo, useState } from 'react';
import type { LabelView } from '@/features/assistant/answer-labels';
import type { AnswerDrawing } from '@/features/assistant/answer-marks';
import { type MapCamera, type MarkerImage, type MarkerLook, useMarkerImages } from '@/map';
import { lookName } from '@/map/marker-looks';
import { hasNativeMap } from '@/map/native-module';

// An answer's labels where the map comes to rest (P04 ticket 68): placed at the answer's own camera, where the camera
// glides, and again each time the map comes to rest after that, as after the User's pan or pinch, so that the tags
// show where there is room in what is on screen. Nothing is placed while the map moves.

interface Since {
  base: unknown;
  framing: unknown;
  camera: MapCamera | null;
}

// The view an answer's labels are placed at: the answer's own (`shown`) until the map comes to rest after the
// answer's camera last moved, which it does whenever `base` or `framing` changes (`useAnswerCamera`); then the camera
// at rest (`MainMap.camera`, which the map's `onCameraIdle` sets), with the same size and area.
export function useRestedView(
  shown: LabelView | null,
  camera: MapCamera | null,
  base: unknown,
  framing: unknown,
): LabelView | null {
  const [since, setSince] = useState<Since>({ base, framing, camera });
  const moved = since.base !== base || since.framing !== framing;
  if (moved) {
    setSince({ base, framing, camera });
  }
  const rested = !moved && camera !== null && camera !== since.camera;
  return useMemo(
    () => (shown === null || camera === null || !rested ? shown : { ...shown, camera }),
    [shown, camera, rested],
  );
}

// How long a drawing placed again waits for its pictures before it is shown with some still to come: the Android
// module then keeps a mark's old picture until its new one is made.
export const HOLD_MS = 1500;

interface Shown {
  base: unknown;
  // Its marks with their looks, as written by `looksKey`.
  looks: string;
  drawing: AnswerDrawing;
  view: LabelView | null;
}

export interface MadeDrawing {
  drawing: AnswerDrawing | null;
  // The view it was placed at.
  view: LabelView | null;
  // Its things' pictures, in their order.
  images: MarkerImage[];
}

function looksOf(drawing: AnswerDrawing | null | undefined): MarkerLook[] {
  return drawing?.things.map(({ look }) => look) ?? [];
}

// A drawing's marks with their looks, as text that two drawings of the same looks share.
function looksKey(drawing: AnswerDrawing | null): string {
  return (drawing?.things ?? []).map(({ id, look }) => `${id} ${lookName(look)}`).join('\n');
}

// The drawing the map shows. One of the same answer's drawing (`base`, which the camera moves for) with other looks,
// as when its labels are placed again at another view, waits, the drawing before it shown, until every picture of it
// is made or `HOLD_MS` has passed: a mark's dot and its tag are one picture, so every mark changes in the same frame
// and none shows its number twice or not at all. Any other is shown at once. `looks` are asked for beside it, so that
// a change of drawing never waits for a picture. `view` is the view `next` was placed at.
export function useMadeDrawing(
  base: unknown,
  next: AnswerDrawing | null,
  view: LabelView | null,
  looks: readonly MarkerLook[],
): MadeDrawing {
  const key = looksKey(next);
  const [shown, setShown] = useState<Shown | null>(next === null ? null : { base, looks: key, drawing: next, view });
  const [late, setLate] = useState<string | null>(null);
  const before = shown !== null && next !== null && shown.base === base && shown.looks !== key ? shown : null;
  const nextLooks = looksOf(next);
  const beforeLooks = looksOf(before?.drawing);
  const images = useMarkerImages([...nextLooks, ...beforeLooks, ...looks]);
  const nextImages = images.slice(0, nextLooks.length);
  const made = !hasNativeMap() || nextImages.every(({ uri }) => uri !== null);
  const waits = before !== null && !made && late !== key;
  const changed = next !== null && (shown?.looks !== key || shown.base !== base);
  useEffect(() => {
    if (!waits && changed && next !== null) {
      setShown({ base, looks: key, drawing: next, view });
    }
  }, [waits, changed, base, next, key, view]);
  useEffect(() => {
    const timer = waits ? setTimeout(setLate, HOLD_MS, key) : 0;
    return (): void => {
      clearTimeout(timer);
    };
  }, [waits, key]);
  if (waits && before !== null) {
    return {
      drawing: before.drawing,
      view: before.view,
      images: images.slice(nextLooks.length, nextLooks.length + beforeLooks.length),
    };
  }
  return { drawing: next, view, images: nextImages };
}
