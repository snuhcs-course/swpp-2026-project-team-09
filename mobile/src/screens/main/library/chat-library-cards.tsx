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
import { CardBox, Said } from './library-parts';
import { cardPlace, type LibraryCardActions } from './use-library-call';

// The library cards of an answer, or of the app's own bubble, each by its action. Each reads the library on the phone
// and writes to it only on its confirm button. A card that ended (booked, cancelled, returned, dismissed) is kept so by
// the chat and shows only how it ended, also when the sheet opens anew.

interface OneProps {
  card: LibraryCard;
  own: boolean;
  bubbleId: number;
  actions: LibraryCardActions;
}

// A card the chat keeps as ended: what it did, with no button.
function Finished({ card, words }: { card: LibraryCard; words: string }): ReactElement {
  return (
    <CardBox testID={`library-${card.library.action}-${card.library.key}`}>
      <Said>{words}</Said>
    </CardBox>
  );
}

function One({ card, own, bubbleId, actions }: OneProps): ReactElement | null {
  const data = card.library;
  const { space: shown } = data;
  const place = cardPlace(bubbleId, data.key);
  const outcome = actions.outcomeOf(place);
  if (outcome !== null) {
    return <Finished card={card} words={outcome.words} />;
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
      return <CancelReturnCard actions={actions} card={data} place={place} />;
    case 'myBookings':
      return <MyBookingsCard card={data} />;
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
    <View style={styles.cards}>
      {cards.map((card) => (
        <One actions={actions} bubbleId={bubbleId} card={card} key={card.library.key} own={own} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cards: { gap: space[3], marginTop: space[2] },
});
