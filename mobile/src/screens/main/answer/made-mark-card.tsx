/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import type { ChatSheetControl } from '../chat-sheet';
import type { Room } from '../layout';
import { cardNumberOf } from '@/features/assistant/cards-scene';
import { BookingFlagRows } from './booking-flag-rows';
import { CardFlagRows } from './card-flag-rows';
import { MarkCard } from './mark-card';
import type { OpenedMark } from './opened-mark';
import { ProposalFlagRows } from './proposal-flag-rows';

interface MadeMarkCardProps {
  control: ChatSheetControl;
  mark: OpenedMark;
  stage: NonNullable<Room['stage']>;
}

// The card of the flag of a scene the app made: a Proposal's rows, each opening the party form (P04 ticket 06), or a
// booking's room, seat, and time with 다른 자리 고르기 (ticket 07), or a restaurant's menu or an event's facts (ticket 08).
export function MadeMarkCard({ control, mark, stage }: MadeMarkCardProps): ReactElement | null {
  const { closeMark, proposal, booking, cards } = control;
  const card = cards?.cards[(cardNumberOf(mark.id) ?? 0) - 1];
  if (card !== undefined) {
    return (
      <MarkCard mark={mark} onClose={closeMark} stage={stage}>
        <CardFlagRows card={card} />
      </MarkCard>
    );
  }
  const { proposals } = control.leaving;
  return (
    <MarkCard mark={mark} onClose={closeMark} stage={stage}>
      {proposal === null ? null : (
        <ProposalFlagRows
          editable={proposals.makingOf(proposal.bubbleId) === 'ready'}
          onEdit={() => {
            closeMark();
            proposals.edit(proposal.bubbleId, proposal.proposal);
          }}
          proposal={proposal.proposal}
        />
      )}
      {proposal === null && booking !== null ? (
        <BookingFlagRows booking={booking} chat={control.chat} onDone={closeMark} stage={control.bookingStage} />
      ) : null}
    </MarkCard>
  );
}
