/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { now } from '@/clock';
import { Button, color, font, space, text } from '@/design-system';
import { bookingLine, bookingTitle, type ShownBooking } from '@/features/assistant/booking-scene';
import type { Chat } from '@/features/assistant/use-chat';
import { bookingKept } from '../library/booking-kept';
import type { BookingStage } from '../library/booking-stage';

interface BookingFlagRowsProps {
  booking: ShownBooking;
  chat: Pick<Chat, 'rooms' | 'showRoom'>;
  stage: BookingStage;
  // Closes the flag's card.
  onDone: () => void;
}

// The card of a booking's flag (P04 ticket 07): the room, the seat and the time the card offers, and 다른 자리 고르기,
// which opens the seat picture, while the room has one and a seat is offered.
export function BookingFlagRows({ booking, chat, stage, onDone }: BookingFlagRowsProps): ReactElement {
  const { kept } = bookingKept(booking, chat);
  const told = stage.seen?.place === booking.place ? stage.seen : null;
  return (
    <View style={styles.rows} testID="booking-flag-rows">
      <Text accessibilityRole="header" style={styles.head}>
        {bookingTitle(kept.space)}
      </Text>
      <Text style={styles.line}>{bookingLine(told?.seat ?? kept.seat, kept.slot, now())}</Text>
      {told?.picks === true ? (
        <Button
          full
          onPress={() => {
            onDone();
            stage.pick();
          }}
          variant="secondary"
        >
          다른 자리 고르기
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  rows: { gap: space[2] },
  head: { ...text.label, fontFamily: font.semiBold, color: color.ink },
  line: { ...text.label, color: color.inkMuted },
});
