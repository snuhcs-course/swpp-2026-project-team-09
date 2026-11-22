/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useMemo } from 'react';
import type { LatLng } from '@/api/types';
import { now } from '@/clock';
import type { LabelView } from '@/features/assistant/answer-labels';
import { type AnswerDrawing, drawingOfScene } from '@/features/assistant/answer-marks';
import { proposalScene, proposalSetting, type ShownProposal } from '@/features/assistant/proposal-scene';
import type { MapAvatar, MarkerLook } from '@/map';
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
export const PROPOSAL_FLAG_ID = 'answer:pick';

// The positions of the everyday map's Friends, by user id.
function friendPositions({ avatars, cards }: EverydayAvatars): Map<string, LatLng> {
  const positions = new Map<string, LatLng>();
  for (const { id, mark } of cards) {
    const avatar = mark.type === 'person' ? avatars.find((one) => one.id === id) : undefined;
    if (avatar !== undefined && mark.type === 'person') {
      positions.set(mark.id, avatar.position);
    }
  }
  return positions;
}

// The Proposal on screen drawn on the map as a Plan is (P04 ticket 06): its flag at its place, which opens its card
// with `onFlag`, the User's walk there from `me`, and the invited Friends' faces where the everyday map shows them. The
// everyday Avatars of other people stay, and the User's own when the User has no position. Null while none is shown.
export function useProposalMap(
  shown: ShownProposal | null,
  map: MainMap,
  room: Room,
  everyday: EverydayAvatars,
  me: { position: LatLng | null; avatars: readonly MapAvatar[] },
  onFlag: (id: string, position: LatLng) => void,
): AnswerMap | null {
  const friends = useMemo(() => friendPositions(everyday), [everyday]);
  const position = me.position;
  const scene = useMemo(
    () => (shown === null ? null : proposalScene(shown, position, friends)),
    [shown, position, friends],
  );
  const draw = useMemo(
    () =>
      shown === null || scene === null
        ? null
        : (view: LabelView | null): AnswerDrawing =>
            drawingOfScene(scene, view, proposalSetting(shown.proposal, now())),
    [shown, scene],
  );
  const framing = useFraming(map, room, true);
  const base = useBase(draw);
  const drawn = useDrawnMap(draw, base, shown, NO_LOOKS, map, framing, scene?.routes, (id) => id === PROPOSAL_FLAG_ID);
  if (drawn === null || shown === null) {
    return null;
  }
  const { markers, lines, drawing } = drawn;
  const others = othersOf(everyday.avatars, everyday.cards, drawing);
  const avatars = position === null ? [...others, ...me.avatars] : others;
  const onPress = (id: string): void => {
    if (id === PROPOSAL_FLAG_ID) {
      const { latitude, longitude } = shown.place;
      onFlag(id, { latitude, longitude });
    }
  };
  return { contents: { markers, lines, avatars }, onPress, ...ANSWER_LIMITS };
}
