/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space } from '@/design-system';
import { friendChips } from '@/features/assistant/made-quests';
import type { Room } from '../layout';
import type { MadeQuestCard } from '../use-made-quest-card';
import { FrameCard } from './answer-frame';
import { InvitedCard } from './invited-card';

interface MadeQuestFrameProps {
  made: MadeQuestCard;
  room: Room;
  onHeight: (height: number) => void;
}

// The card after inviting of a Quest made from a Plan, opened again from the everyday map, built from the Quest
// itself: a chip for each Friend invited with how they stand, the lines with the destination's start, and the steps. It
// stands in the answer frame's card without a pill, the input, or the tab bar under it, as a received invitation's.
export function MadeQuestFrame({ made, room, onHeight }: MadeQuestFrameProps): ReactElement | null {
  const { bottom } = useSafeAreaInsets();
  const { shown, close } = made;
  if (shown === null) {
    return null;
  }
  return (
    <FrameCard
      barRoom={bottom + space[4]}
      onHeight={onHeight}
      stageHeight={room.stage?.height ?? null}
      testID="made-quest-frame"
    >
      <InvitedCard
        chips={friendChips(shown)}
        onClose={close}
        standings={shown.standings}
        startAt={shown.destination.startsAt}
        steps={shown.quest.subQuests}
      />
    </FrameCard>
  );
}
