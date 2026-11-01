/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LibraryCard } from '@/api/assistant-types';
import { space } from '@/design-system';
import { BookRoomCard } from './book-room-card';
import { BookSeatCard } from './book-seat-card';
import { CancelReturnCard, MyBookingsCard } from './bookings-cards';
import { SeatsCard } from './seats-card';
import type { LibraryCardActions } from './use-library-call';

// The library cards of an answer, or of the app's own bubble, each by its action. Each reads the library on the phone
// and writes to it only on its confirm button.

function One({
  card,
  own,
  actions,
}: {
  card: LibraryCard;
  own: boolean;
  actions: LibraryCardActions;
}): ReactElement | null {
  const data = card.library;
  const { space: shown } = data;
  switch (data.action) {
    case 'book':
      if (shown === null) {
        return null;
      }
      return shown.unit === 'seat' ? (
        <BookSeatCard actions={actions} adjustable={own} card={data} space={shown} />
      ) : (
        <BookRoomCard actions={actions} card={data} space={shown} />
      );
    case 'seats':
      return shown === null ? null : <SeatsCard actions={actions} card={data} space={shown} />;
    case 'cancel':
    case 'return':
      return <CancelReturnCard card={data} />;
    case 'myBookings':
      return <MyBookingsCard card={data} />;
    default:
      return null;
  }
}

export function ChatLibraryCards({
  cards,
  own,
  actions,
}: {
  cards: readonly LibraryCard[];
  own: boolean;
  actions: LibraryCardActions;
}): ReactElement {
  return (
    <View style={styles.cards}>
      {cards.map((card) => (
        <One actions={actions} card={card} key={card.library.key} own={own} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cards: { gap: space[3], marginTop: space[2] },
});
