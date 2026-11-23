/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { now } from '@/clock';
import { space } from '@/design-system';
import { friendChips } from '@/features/assistant/made-quests';
import type { MadeQuestView } from '@/features/assistant/use-made-quests';
import type { Room } from '../layout';
import { FrameCard } from './frame-card';
import { InvitedCard } from './invited-card';

interface MadeQuestFrameProps {
  made: MadeQuestView;
  onClose: () => void;
  room: Room;
  onHeight: (height: number) => void;
}

// The card after inviting of a Quest made from a Plan, opened again from the everyday map, built from the Quest
// itself: a chip for each Friend invited with how they stand, the lines with the destination's start, and the steps,
// closed by the card's ✕ (P04 ticket 52). It stands in the answer frame's card without a pill, the input, or the tab bar under it, as a received invitation's.
export function MadeQuestFrame({ made, onClose, room, onHeight }: MadeQuestFrameProps): ReactElement {
  const { bottom } = useSafeAreaInsets();
  return (
    <FrameCard
      barRoom={bottom + space[4]}
      onClose={onClose}
      onHeight={onHeight}
      stageHeight={room.stage?.height ?? null}
      testID="made-quest-frame"
    >
      <InvitedCard
        chips={friendChips(made)}
        standings={made.standings}
        startAt={made.destination.startsAt}
        steps={made.quest.subQuests}
        title={made.quest.title}
        now={now()}
      />
    </FrameCard>
  );
}
