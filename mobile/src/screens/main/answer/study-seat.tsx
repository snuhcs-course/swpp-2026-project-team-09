/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import type { PlanStudy } from '@/api/study-plan-types';
import { withLibraryDefaults } from '@/api/server/library-card-answers';
import { cardPlace } from '@/features/assistant/use-chat';
import { BookSeatCard } from '../library/book-seat-card';
import type { LibraryCardActions } from '../library/use-library-call';
import { StudySpaces } from './study-spaces';

// The body of a study place opened in the meal answer's view of a Restaurant (P10 tickets 19 and 22): 관정관's is
// today's seat ticket, the book card the main server sends with its Plan, with its seat and 예약하기; any other place's
// is its spaces and their hours.

// The chat's library cards, by which the seat ticket reads and books, and the reply that holds the Plan.
export interface SeatChat {
  actions: LibraryCardActions;
  bubbleId: number;
}

export function StudyBody({ study, chat }: { study: PlanStudy; chat: SeatChat | null }): ReactElement {
  const card = study.book === null ? null : withLibraryDefaults(study.book.card);
  const space = card?.space ?? null;
  if (card === null || space?.unit !== 'seat' || chat === null) {
    return <StudySpaces spaces={study.spaces} />;
  }
  return (
    <BookSeatCard
      actions={chat.actions}
      adjustable={false}
      card={card}
      place={cardPlace(chat.bubbleId, card.key)}
      space={space}
    />
  );
}
