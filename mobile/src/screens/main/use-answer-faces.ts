/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { PlanInput } from '@/api/assistant-types';
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
