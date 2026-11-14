/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useMemo } from 'react';
import { drawingOfScene } from '@/features/assistant/answer-marks';
import type { ShownLookup } from '@/features/assistant/use-shown-lookup';
import { type MapAvatar, type MarkerLook, useMarkerImages } from '@/map';
import type { Room } from './layout';
import {
  ANSWER_MIN_LEVEL,
  type AnswerMap,
  type EverydayAvatars,
  ignorePress,
  othersOf,
  useDrawnMap,
} from './use-answer-map';
import type { MainMap } from './use-main-map';

const NO_LOOKS: readonly MarkerLook[] = [];
const NO_AVATARS: readonly MapAvatar[] = [];

function unselected({ image: { view } }: MapAvatar): MarkerLook {
  return view.kind === 'person' ? { ...view, selected: false } : view;
}

// The everyday Avatars with their faces unselected: a selection made before asking stands behind the frame. A look
// whose picture is still to be made keeps the picture the face has.
function useUnselected(avatars: readonly MapAvatar[]): MapAvatar[] {
  const images = useMarkerImages(avatars.map((avatar) => unselected(avatar)));
  return avatars.map((avatar, at) => {
    const image = images[at];
    return image === undefined || (image.uri === null && avatar.image.uri !== null) ? avatar : { ...avatar, image };
  });
}

// The Lookup on screen drawn on the map as a Plan is, under the answer's pill, in place of the everyday map's markers,
// lines, and the User's own Avatar. The everyday Friends' Avatars stay but for those it draws, none with a "+": a
// Lookup is not recalculated, so nothing on the map takes a press. Null while no Lookup is shown.
export function useLookupMap(
  { lookup }: ShownLookup,
  map: MainMap,
  room: Room,
  everyday: EverydayAvatars,
): AnswerMap | null {
  const drawing = useMemo(() => (lookup === null ? null : drawingOfScene(lookup.scene)), [lookup]);
  const others = drawing === null ? NO_AVATARS : othersOf(everyday.avatars, everyday.cards, drawing);
  const faces = useUnselected(others);
  const drawn = useDrawnMap(drawing, null, NO_LOOKS, map, room, true);
  if (drawn === null) {
    return null;
  }
  return { contents: { ...drawn, avatars: faces }, onPress: ignorePress, nativeMinLevel: ANSWER_MIN_LEVEL };
}
