/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useEffect, useMemo, useState } from 'react';
import type { LabelView } from '@/features/assistant/answer-labels';
import type { AnswerDrawing } from '@/features/assistant/answer-marks';
import { type MapCamera, type MarkerImage, type MarkerLook, useLooksSettled, useMarkerImages } from '@/map';
import { lookName } from '@/map/marker-looks';
import { sameCamera } from '@/map/projection';
import { type Frame, type FrameKey, sameKey } from './framed-camera';

// An answer's labels where the map comes to rest (P04 ticket 69): placed at the answer's own camera, where the camera
// glides, and again each time the map comes to rest after that, as after the User's pan or pinch, so that the tags
// show where there is room in what is on screen. Nothing is placed while the map moves. Both hooks compare what they
// keep by value: the drawings and views they are given may be new objects at every render.

function sameOwn(one: MapCamera | null, other: MapCamera | null): boolean {
  return one === null || other === null ? one === other : sameCamera(one, other);
}

interface Since {
  // The framing event last seen (`Frame`): its key, whether its drawing was the one the map shows, and the answer's own
  // camera then.
  key: FrameKey;
  active: boolean;
  own: MapCamera | null;
  // The camera at rest when the map last came to rest, or at the event; whether it has come to rest since the event,
  // or stood at the event's own camera already; and the view the labels were placed in then.
  camera: MapCamera | null;
  rested: boolean;
  room: LabelView | null;
}

function cameFirst(key: FrameKey, active: boolean, shown: LabelView | null, camera: MapCamera | null): Since {
  const own = shown?.camera ?? null;
  return { key, active, own, camera, rested: camera !== null && own !== null && sameOwn(camera, own), room: shown };
}

// The view an answer's labels are placed at: the answer's own (`shown`), where the map glides, from a framing event
// (another reply, another Plan, a press that chooses: `Frame`) until the map comes to rest after it; until then it
// follows the card's layout, as the glide does (`useFramedCamera`). From then on, the camera at rest (`MainMap.camera`,
// which the map's `onCameraIdle` sets), in the view as it was when the map came to rest: its size, its labels' area
// between the cards, and the phone's font size. A card's height or fold is no framing event and moves no camera, so it
// places no label again (P10 ticket 31, the user's phone: folding a time card away and back made the map blink, every
// mark drawn again); the next rest, after the User's pan, or the next event places them in the room there is then.
export function useRestedView(
  shown: LabelView | null,
  camera: MapCamera | null,
  { key, active = true }: Frame,
): LabelView | null {
  const own = shown?.camera ?? null;
  const [since, setSince] = useState<Since>(() => cameFirst(key, active, shown, camera));
  const event = !sameKey(since.key, key) || (active && !since.active) || (since.own === null && own !== null);
  const arrived = !event && camera !== null && camera !== since.camera;
  const now = event
    ? cameFirst(key, active, shown, camera)
    : arrived
      ? { ...since, active, camera, rested: true, room: shown }
      : { ...since, active };
  if (event || arrived || active !== since.active) {
    setSince(now);
  }
  const { rested, room } = now;
  return useMemo(
    () =>
      shown === null || camera === null || !rested || room === null ? shown : { ...room, camera, avoid: shown.avoid },
    [shown, camera, rested, room],
  );
}

// A drawing's marks with their looks, as text that two drawings of the same looks share.
export function looksKey(drawing: AnswerDrawing | null): string {
  return (drawing?.things ?? []).map(({ id, look }) => `${id} ${lookName(look)}`).join('\n');
}

interface Shown {
  // The answer's drawing it was made from and its own looks, as `looksKey` writes them.
  base: string;
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

// The drawing the map shows. One made from the same answer's drawing as the one shown (`base`, `looksKey` of the
// drawing the camera moves for) with other looks, as when its labels are placed again at another view, waits, the
// drawing before it shown, until every picture of it is made or will not be (`useLooksSettled`), however long that
// takes: every mark changes in the same frame, a candidate's round with its minutes (P04 ticket 83), so that none shows
// its number twice or not at all, and none leaves the map while its new picture is on its way. A look already made is
// the same picture again. Any other drawing is shown at once. `looks` are asked for beside it, after its own pictures
// (P04 ticket 81), so that a change of drawing never waits for a picture. `view` is the view `next` was placed at.
export function useMadeDrawing(
  base: string,
  next: AnswerDrawing | null,
  view: LabelView | null,
  looks: readonly MarkerLook[],
): MadeDrawing {
  const key = looksKey(next);
  const [shown, setShown] = useState<Shown | null>(next === null ? null : { base, looks: key, drawing: next, view });
  const before = shown !== null && next !== null && shown.base === base && shown.looks !== key ? shown : null;
  const nextLooks = looksOf(next);
  const beforeLooks = looksOf(before?.drawing);
  const images = useMarkerImages([...nextLooks, ...beforeLooks], looks);
  const nextImages = images.slice(0, nextLooks.length);
  const made = useLooksSettled(nextLooks);
  const waits = before !== null && !made;
  const changed = next !== null && (shown?.looks !== key || shown.base !== base);
  useEffect(() => {
    if (!waits && changed && next !== null) {
      setShown({ base, looks: key, drawing: next, view });
    }
  }, [waits, changed, base, next, key, view]);
  if (waits && before !== null) {
    return {
      drawing: before.drawing,
      view: before.view,
      images: images.slice(nextLooks.length, nextLooks.length + beforeLooks.length),
    };
  }
  return { drawing: next, view, images: nextImages };
}
