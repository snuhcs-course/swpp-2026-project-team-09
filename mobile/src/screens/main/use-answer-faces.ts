/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useMemo } from 'react';
import type { AnswerDrawing } from '@/features/assistant/answer-marks';
import type { ViewArea } from '@/features/assistant/answer-camera';
import { faceBox, labelBoxAt, type LabelView, overlaps } from '@/features/assistant/answer-labels';
import { ANSWER_SYMBOL_BOX } from '@/design-system';
import { nearOwnMark } from '@/features/assistant/answer-marks';
import { nearKeptWords } from '@/features/assistant/kept-drawing';
import type { CardView } from '@/features/map/adapter';
import type { PlanInput } from '@/api/assistant-types';
import type { LatLng } from '@/api/types';
import { peopleOf } from '@/features/assistant/plan-input';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { friendIdOf } from '@/features/map/adapter';
import { inView, type MapAvatar, type MarkerLook, useMarkerImages } from '@/map';
import { SELECTED_ORDER } from './use-things';

// The face a Friend's Avatar shows while an answer is on screen: while people are picked in the time card, lit when
// checked and a "+" when not (P04 ticket 64); else lit while they are in the Plan or their add is on its way (board
// p13), and a "+" while a press would pick them. Anyone else's, and every face once the Plan is sent, is the everyday
// map's look unselected: a selection made before asking stands behind the frame. Every face but the lit ones is faint,
// as the answer's own marks stand out.
export function answerFaceOf(
  { id, image: { view } }: MapAvatar,
  input: PlanInput,
  pendingAdd: string | null,
  sent: boolean,
  picked: readonly string[] | null = null,
): MarkerLook {
  if (view.kind !== 'person') {
    return view;
  }
  const face = { ...view, selected: false, faded: true };
  const userId = friendIdOf(id);
  if (userId === null || sent) {
    return face;
  }
  if (picked !== null) {
    return picked.includes(userId) ? { ...face, selected: true, faded: false } : { ...face, addable: true };
  }
  if (userId === pendingAdd) {
    return { ...face, selected: true, faded: false };
  }
  return peopleOf(input).some((person) => person.userId === userId)
    ? { ...face, selected: true, faded: false }
    : { ...face, addable: true };
}

// The Avatars the Plan leaves, with their faces, the lit one above the others. The selected look of each face with a
// "+" is asked for with it, so that a press lights the face at once. A look whose picture is still to be made keeps
// the picture the face has, so that a native map never leaves the face out meanwhile.
export function useFaces(
  avatars: readonly MapAvatar[],
  { answer, pendingAdd, picked }: ShownAnswer,
  sent: boolean,
): MapAvatar[] {
  const looks = avatars.map((avatar) =>
    answer === null ? avatar.image.view : answerFaceOf(avatar, answer.input, pendingAdd, sent, picked),
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
    // A lit Friend, checked while picking or in the Plan, carries the check in front of their name (boards p3, p13).
    const checked = lit && friendIdOf(avatar.id) !== null && avatar.text !== undefined;
    return {
      ...avatar,
      image: made,
      order: lit ? SELECTED_ORDER : 0,
      text: checked ? `✓ ${avatar.text ?? ''}` : avatar.text,
    };
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

// The boxes a face must not cover: the chosen place's label, its legs' minutes, and every candidate's and the pick's
// dot, so that no candidate vanishes under a face (the map draws every Avatar over every marker).
function keptBoxes(placed: AnswerDrawing, view: LabelView): ViewArea[] {
  const boxes: ViewArea[] = [];
  for (const { id, position, look } of placed.things) {
    const dot = look.kind === 'answer' && look.symbol?.type === 'dot' ? look.symbol : null;
    if (dot !== null && (dot.role === 'candidate' || dot.role === 'pick')) {
      const { x, y } = inView(position, view.camera, view.size);
      boxes.push({ top: y - DOT_HALF, right: x + DOT_HALF, bottom: y + DOT_HALF, left: x - DOT_HALF });
    }
    if ((id === 'answer:pick' || id.startsWith('answer:leg:')) && look.kind === 'answer' && look.label !== null) {
      boxes.push(labelBoxAt(view, position, look.label));
    }
  }
  return boxes;
}

const DOT_HALF = ANSWER_SYMBOL_BOX / 2;

// The faces with those over the chosen place's label, its legs' minutes, or a candidate's dot left out: the chosen
// label and the minutes stay on top, and every candidate keeps a dot to be pressed (the answer screen's redesign).
export function facesClearOf(
  faces: readonly MapAvatar[],
  placed: AnswerDrawing,
  view: LabelView | null,
): readonly MapAvatar[] {
  // Only a meal answer of the redesign (`keep`); every other answer keeps its faces as they were.
  if (view === null || placed.keep === undefined) {
    return faces;
  }
  const boxes = keptBoxes(placed, view);
  const clear = faces.filter(({ position }) => !boxes.some((box) => overlaps(faceBox(view, position), box)));
  return clear.length === faces.length ? faces : clear;
}
