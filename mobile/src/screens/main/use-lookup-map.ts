/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useMemo } from 'react';
import type { LabelView } from '@/features/assistant/answer-labels';
import { type AnswerDrawing, drawingOfScene } from '@/features/assistant/answer-marks';
import { type AwaySeats, LOOKUP_SETTING, studyDrawing, studyScene } from '@/features/assistant/study-area';
import type { ShownLookup } from '@/features/assistant/use-shown-lookup';
import { type MapAvatar, type MarkerLook, useMarkerImages } from '@/map';
import type { Room } from './layout';
import {
  ANSWER_LIMITS,
  type AnswerMap,
  type EverydayAvatars,
  othersOf,
  useBase,
  useDrawnMap,
  useFraming,
} from './use-answer-map';
import type { MainMap } from './use-main-map';

const NO_LOOKS: readonly MarkerLook[] = [];
const NO_AVATARS: readonly MapAvatar[] = [];

function ignoreRaise(): void {
  // Nothing raises a card where none is shown.
}

// The Lookup's own marks, which its drawing names `answer:…`, and not the everyday Avatars that stay under it.
function ownMark(id: string): boolean {
  return id.startsWith('answer:');
}

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
// so a press on one of its own marks, its flag first, only raises its card with `raise` (the feedback of 2026-11-22,
// in place of the dock's 근거 ›), each title ending with "›" to say so, and nothing else on the map takes a press. The User's own Avatar (`mine`) stays when
// the Lookup does not draw the User, as for a Friend. The camera follows the conversation's last reply, but for a
// `study` Lookup, which outlines the area its request sent where the User left the camera, one faded mark a building,
// and its flag to 관정 with the free `seats` the phone read. Null while no Lookup is shown.
export function useLookupMap(
  { lookup, reply }: ShownLookup,
  map: MainMap,
  room: Room,
  everyday: EverydayAvatars,
  mine: readonly MapAvatar[],
  seats: AwaySeats | null = null,
  raise: (earlier: boolean) => void = ignoreRaise,
): AnswerMap | null {
  const area = reply?.area ?? null;
  const draw = useMemo(
    () =>
      lookup === null
        ? null
        : (view: LabelView | null): AnswerDrawing =>
            studyDrawing(drawingOfScene(studyScene(lookup, seats), view, LOOKUP_SETTING), lookup, area),
    [lookup, seats, area],
  );
  const framing = useFraming(map, room, true);
  const base = useBase(draw);
  const others = base === null ? NO_AVATARS : othersOf(everyday.avatars, everyday.cards, base);
  const faces = useUnselected(others);
  const drawn = useDrawnMap(draw, base, reply, NO_LOOKS, map, framing, lookup?.scene.routes, ownMark);
  if (drawn === null || lookup === null) {
    return null;
  }
  const { markers, lines } = drawn;
  const drawsMe = lookup.scene.people.some(({ me }) => me);
  const avatars = drawsMe ? faces : [...faces, ...mine];
  const onPress = (id: string): void => {
    if (ownMark(id)) {
      raise(false);
    }
  };
  return { contents: { markers, lines, avatars }, onPress, ...ANSWER_LIMITS };
}
