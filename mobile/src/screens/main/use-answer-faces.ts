/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useMemo } from 'react';
import type { AnswerDrawing } from '@/features/assistant/answer-marks';
import { faceBox, labelBoxAt, type LabelView, overlaps } from '@/features/assistant/answer-labels';
import { nearOwnMark } from '@/features/assistant/answer-marks';
import { nearKeptWords } from '@/features/assistant/kept-drawing';
import type { CardView } from '@/features/map/adapter';
import type { PlanInput } from '@/api/assistant-types';
import type { LatLng } from '@/api/types';
import { peopleOf } from '@/features/assistant/plan-input';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { friendIdOf } from '@/features/map/adapter';
import { type MapAvatar, type MarkerLook, useMarkerImages } from '@/map';
import { SELECTED_ORDER } from './use-things';

// The face a Friend's Avatar shows while an answer is on screen: the selected look while their add is on its way, and
// a "+" while a press would add them. Anyone else's, and every face once the Plan is sent, is the everyday map's look
// unselected: a selection made before asking stands behind the frame, and only the add lights a face. Every face but
// the lit one is faint, as the answer's own marks stand out.
export function answerFaceOf(
  { id, image: { view } }: MapAvatar,
  input: PlanInput,
  pendingAdd: string | null,
  sent: boolean,
): MarkerLook {
  if (view.kind !== 'person') {
    return view;
  }
  const face = { ...view, selected: false, faded: true };
  const userId = friendIdOf(id);
  if (userId === null || sent) {
    return face;
  }
  if (userId === pendingAdd) {
    return { ...face, selected: true, faded: false };
  }
  return peopleOf(input).some((person) => person.userId === userId) ? face : { ...face, addable: true };
}

// The Avatars the Plan leaves, with their faces, the lit one above the others. The selected look of each face with a
// "+" is asked for with it, so that a press lights the face at once. A look whose picture is still to be made keeps
// the picture the face has, so that a native map never leaves the face out meanwhile.
export function useFaces(
  avatars: readonly MapAvatar[],
  { answer, pendingAdd }: ShownAnswer,
  sent: boolean,
): MapAvatar[] {
  const looks = avatars.map((avatar) =>
    answer === null ? avatar.image.view : answerFaceOf(avatar, answer.input, pendingAdd, sent),
  );
  const ahead = looks.flatMap((look) =>
    look.kind === 'person' && look.addable === true ? [{ ...look, addable: false, selected: true, faded: false }] : [],
  );
  const images = useMarkerImages([...looks, ...ahead]);
  return avatars.map((avatar, at) => {
    const image = images[at];
    const look = looks[at];
    const made = image === undefined || (image.uri === null && avatar.image.uri !== null) ? avatar.image : image;
    const lit = look?.kind === 'person' && look.selected === true;
    return { ...avatar, image: made, order: lit ? SELECTED_ORDER : 0 };
  });
}

// The everyday Friends' faces behind a scene the app made (a Proposal's, P04 ticket 06), all faint, as a Plan's are:
// the scene's own marks stand out. A look whose picture is still to be made keeps the picture the face has.
export function useFadedFaces(avatars: readonly MapAvatar[]): MapAvatar[] {
  const looks = avatars.map(({ image: { view } }) =>
    view.kind === 'person' ? { ...view, selected: false, faded: true } : view,
  );
  const images = useMarkerImages(looks);
  return avatars.map((avatar, at) => {
    const image = images[at];
    const made = image === undefined || (image.uri === null && avatar.image.uri !== null) ? avatar.image : image;
    return { ...avatar, image: made, order: 0 };
  });
}

// The faces' points, the same array while they stay where they are.
export function useFacePoints(faces: readonly MapAvatar[]): readonly LatLng[] {
  const key = faces.map(({ position }) => `${String(position.latitude)},${String(position.longitude)}`).join(';');
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- the key stands for the faces' points.
  return useMemo(() => faces.map(({ position }) => position), [key]);
}

// The Avatars of people the Plan does not draw: Friends and the other people of the User's Party, not the User's own
// nor the shuttle's vehicles. One near one of the Plan's own marks, or under the words of a Quest already set (P04
// ticket 20), gives way too: the map draws every Avatar above every marker, so it would lie over the mark or its words.
export function othersOf(
  avatars: readonly MapAvatar[],
  cards: readonly CardView[],
  drawing: AnswerDrawing,
): MapAvatar[] {
  const others = new Set(
    cards.flatMap(({ id, mark }) => (mark.type === 'person' && !drawing.userIds.includes(mark.id) ? [id] : [])),
  );
  return avatars.filter(
    ({ id, position }) => others.has(id) && !nearOwnMark(drawing, position) && !nearKeptWords(drawing, position),
  );
}

// The faces with those under the chosen place's label left out: the map draws every Avatar over every marker, and the
// chosen place's label stays on top (the answer screen's redesign).
export function facesClearOf(
  faces: readonly MapAvatar[],
  placed: AnswerDrawing,
  view: LabelView | null,
): readonly MapAvatar[] {
  const pick = placed.things.find(({ id }) => id === 'answer:pick');
  const label = pick?.look.kind === 'answer' ? pick.look.label : null;
  if (view === null || pick === undefined || label === null) {
    return faces;
  }
  const box = labelBoxAt(view, pick.position, label);
  const clear = faces.filter(({ position }) => !overlaps(faceBox(view, position), box));
  return clear.length === faces.length ? faces : clear;
}
