/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import type { LibraryCardData, LibrarySpace } from '@/api/assistant-types';
import { now } from '@/clock';
import { spaceWords } from '@/library/cards/bookings';
import { bookKeyOf, windowWords } from '@/library/cards/room-window';
import { whenWords } from '@/library/cards/times';
import { keepWaitingRoom } from '@/library/room-bookings';
import { CLOSED, NOT_BOOKED } from './book-seat-card';
import { CardBox, DECLINE, Notes, Pill, Pills, Said, SpaceRow } from './library-parts';
import { Choices } from './room-parts';
import { PartyStatus, usePartyRequest } from './room-party';
import type { LibraryCardActions } from './use-library-call';

// The room book card of a study plan for a date after the booking window, whose key ends in `:wait`. The library
// would refuse the date, so the card reads no rooms: it shows the day, the time, the room's size and each person's
// note, and gathers the consents through the room request. 예약하기 waits for the window; the phone keeps the request
// with the card by its Quest, for the room-window Notification (`./waiting-room.ts`).

interface WaitingRoomCardProps {
  card: LibraryCardData;
  space: LibrarySpace;
  place: string;
  actions: LibraryCardActions;
}

export function WaitingRoomCard({ card, space, place, actions }: WaitingRoomCardProps): ReactElement {
  const key = bookKeyOf(card.key);
  const date = card.date ?? key?.date ?? '';
  const [useDesc, setUseDesc] = useState<string | null>(card.useDesc);
  const party = usePartyRequest(card, place, useDesc, (made) => {
    const kept = { requestId: made.id, card: { ...card, useDesc: made.useDesc ?? useDesc } };
    void keepWaitingRoom(made.questId, kept).catch(() => null);
  });
  const status = party.request?.status;
  const decline = (): void => {
    actions.finish(place, CLOSED.declined);
    actions.addOwn({ text: NOT_BOOKED });
  };
  return (
    <CardBox testID={`library-book-${card.key}`}>
      <SpaceRow
        icon="users"
        meta={whenWords(date, card.start ?? key?.start ?? '', card.minutes ?? key?.minutes ?? 0, now())}
        title={spaceWords(space)}
      />
      {card.useDesc === null ? (
        <Choices chosen={useDesc} onChoose={setUseDesc} options={card.useDescOptions} title="사용 용도" />
      ) : null}
      <PartyStatus party={party} />
      {status === 'gathering' || status === 'ready' ? <Said>{windowWords(date)}</Said> : null}
      <Pills>
        <Pill disabled label="예약하기" onPress={decline} primary />
        <Pill label={DECLINE} onPress={decline} />
      </Pills>
      <Notes notes={card.notes} />
    </CardBox>
  );
}
