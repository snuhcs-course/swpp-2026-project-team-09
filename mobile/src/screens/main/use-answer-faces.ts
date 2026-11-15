/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { PlanInput } from '@/api/assistant-types';
import { peopleOf } from '@/features/assistant/plan-input';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { friendIdOf } from '@/features/map/adapter';
import { type MapAvatar, type MarkerLook, useMarkerImages } from '@/map';
import { SELECTED_ORDER } from './use-things';

// The face a Friend's Avatar shows while an answer is on screen: the selected look while their add is on its way, and
// a "+" while a press would add them. Anyone else's, and every face once the Plan is sent, is the everyday map's look
// unselected: a selection made before asking stands behind the frame, and only the add lights a face.
function faceOf(
  { id, image: { view } }: MapAvatar,
  input: PlanInput,
  pendingAdd: string | null,
  sent: boolean,
): MarkerLook {
  if (view.kind !== 'person') {
    return view;
  }
  const face = { ...view, selected: false };
  const userId = friendIdOf(id);
  if (userId === null || sent) {
    return face;
  }
  if (userId === pendingAdd) {
    return { ...face, selected: true };
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
    answer === null ? avatar.image.view : faceOf(avatar, answer.input, pendingAdd, sent),
  );
  const ahead = looks.flatMap((look) =>
    look.kind === 'person' && look.addable === true ? [{ ...look, addable: false, selected: true }] : [],
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
