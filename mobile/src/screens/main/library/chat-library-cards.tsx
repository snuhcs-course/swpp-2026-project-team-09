/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LibraryCard } from '@/api/assistant-types';
import { space } from '@/design-system';
import { type CardOutcome, cardPlace, type ChatBubble } from '@/features/assistant/use-chat';
import { BookRoomCard } from './book-room-card';
import { BookSeatCard } from './book-seat-card';
import { BookedTicket } from './booked-ticket';
import { CancelReturnCard, MyBookingsCard } from './bookings-cards';
import { SeatsCard } from './seats-card';
import { CardBox, Said } from './library-parts';
import type { LibraryCardActions } from './use-library-call';

// The library cards of an answer, or of the app's own bubble, each by its action. Each reads the library on the phone
// and writes to it only on its confirm button. A card that ended (booked, cancelled, returned, dismissed) is kept so by
// the chat and shows only how it ended, also when the sheet opens anew.

interface OneProps {
  card: LibraryCard;
  own: boolean;
  bubbleId: number;
  actions: LibraryCardActions;
}

const OWN_WORDS = new Set<LibraryCard['library']['action']>(['cancel', 'return', 'myBookings']);

// A reply of the Assistant that holds only cancel, return, or 내 예약 cards, and a seat's done message, show no words
// but the card's: the Assistant never sees the bookings, and its words would only point at the card (P01 ticket 15).
// The app's own words over such a card stay.
export function speaksForItself({ cards, done, own = false }: Pick<ChatBubble, 'cards' | 'done' | 'own'>): boolean {
  if (done?.ticket !== undefined) {
    return true;
  }
  return (
    !own && cards.length > 0 && cards.every((card) => card.kind === 'library' && OWN_WORDS.has(card.library.action))
  );
}

// A card the chat keeps as ended: what it did, with no button, and the booking it ended, greyed.
function Finished({ card, outcome }: { card: LibraryCard; outcome: CardOutcome }): ReactElement {
  return (
    <CardBox testID={`library-${card.library.action}-${card.library.key}`}>
      <Said>{outcome.words}</Said>
      {outcome.ticket === undefined ? null : <BookedTicket ticket={outcome.ticket} />}
    </CardBox>
  );
}

function One({ card, own, bubbleId, actions }: OneProps): ReactElement | null {
  const data = card.library;
  const { space: shown } = data;
  const place = cardPlace(bubbleId, data.key);
  const outcome = actions.outcomeOf(place);
  if (outcome !== null && outcome.kind !== 'pending') {
    // A booking on the map has its done message, so its card adds no line (P01 ticket 03); one cancelled from that
    // message says so there (ticket 15).
    const told = (outcome.kind === 'booked' && actions.bandOnBar?.(place) === true) || outcome.kind === 'cancelled';
    return told && data.action === 'book' ? null : <Finished card={card} outcome={outcome} />;
  }
  switch (data.action) {
    case 'book':
      if (shown === null) {
        return null;
      }
      return shown.unit === 'seat' ? (
        <BookSeatCard actions={actions} adjustable={own} card={data} place={place} space={shown} />
      ) : (
        <BookRoomCard actions={actions} card={data} place={place} space={shown} />
      );
    case 'seats':
      return shown === null ? null : <SeatsCard actions={actions} card={data} space={shown} />;
    case 'cancel':
    case 'return':
      return <CancelReturnCard actions={actions} bubbleId={bubbleId} card={data} place={place} />;
    case 'myBookings':
      return <MyBookingsCard actions={actions} bubbleId={bubbleId} card={data} />;
    default:
      return null;
  }
}

export function ChatLibraryCards({
  cards,
  own,
  bubbleId,
  actions,
}: {
  cards: readonly LibraryCard[];
  own: boolean;
  bubbleId: number;
  actions: LibraryCardActions;
}): ReactElement {
  return (
    <View style={styles.cards} testID="library-cards">
      {cards.map((card) => (
        <One actions={actions} bubbleId={bubbleId} card={card} key={card.library.key} own={own} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // No room of its own over the cards: the turn's parts already stand apart, and on the map the seat ticket is the
  // first thing at the card's low step, which shows two lines (P01 ticket 09).
  cards: { gap: space[3] },
});
