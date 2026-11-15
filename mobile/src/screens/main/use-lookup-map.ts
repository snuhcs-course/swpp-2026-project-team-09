/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useMemo } from 'react';
import type { LabelView } from '@/features/assistant/answer-labels';
import { type AnswerDrawing, drawingOfScene } from '@/features/assistant/answer-marks';
import type { ShownLookup } from '@/features/assistant/use-shown-lookup';
import { type MapAvatar, type MarkerLook, useMarkerImages } from '@/map';
import type { Room } from './layout';
import {
  ANSWER_LIMITS,
  type AnswerMap,
  type EverydayAvatars,
  ignorePress,
  othersOf,
  useBase,
  useDrawnMap,
  useFraming,
} from './use-answer-map';
import type { MainMap } from './use-main-map';

const NO_LOOKS: readonly MarkerLook[] = [];
const NO_AVATARS: readonly MapAvatar[] = [];

function unselected({ image: { view } }: MapAvatar): MarkerLook {
  return view.kind === 'person' ? { ...view, selected: false } : view;
}

// The everyday Avatars with their faces unselected and in the everyday order: a selection made before asking stands
// behind the frame. A look whose picture is still to be made keeps the picture the face has.
function useUnselected(avatars: readonly MapAvatar[]): MapAvatar[] {
  const images = useMarkerImages(avatars.map((avatar) => unselected(avatar)));
  return avatars.map((avatar, at) => {
    const image = images[at];
    const made = image === undefined || (image.uri === null && avatar.image.uri !== null) ? avatar.image : image;
    return { ...avatar, image: made, order: 0 };
  });
}

// The Lookup on screen drawn on the map as a Plan is, under the answer's pill, in place of the everyday map's markers
// and lines. The everyday Friends' Avatars stay but for those it draws, none with a "+": a Lookup is not recalculated,
// so nothing on the map takes a press. The User's own Avatar (`mine`) stays when the Lookup does not draw the User, as
// for a Friend. The camera follows the conversation's last reply. Null while no Lookup is shown.
export function useLookupMap(
  { lookup, reply }: ShownLookup,
  map: MainMap,
  room: Room,
  everyday: EverydayAvatars,
  mine: readonly MapAvatar[],
): AnswerMap | null {
  const draw = useMemo(
    () => (lookup === null ? null : (view: LabelView | null): AnswerDrawing => drawingOfScene(lookup.scene, view)),
    [lookup],
  );
  const framing = useFraming(map, room, true);
  const base = useBase(draw);
  const others = base === null ? NO_AVATARS : othersOf(everyday.avatars, everyday.cards, base);
  const faces = useUnselected(others);
  const drawn = useDrawnMap(draw, base, reply, NO_LOOKS, map, framing);
  if (drawn === null || lookup === null) {
    return null;
  }
  const { markers, lines } = drawn;
  const drawsMe = lookup.scene.people.some(({ me }) => me);
  const avatars = drawsMe ? faces : [...faces, ...mine];
  return { contents: { markers, lines, avatars }, onPress: ignorePress, ...ANSWER_LIMITS };
}
