/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { color, font, Icon, radius, space, text } from '@/design-system';

// The seat card's ticket (P01 ticket 09): one row with the room and its free seats at the left, and the seat at the
// right, a dashed line between. The room opens the room list under it, the seat the seat picture. It stands in its
// final place and size from the first frame, and a value not read yet fills in where it stands.

export interface TicketOf {
  // The room on screen ("7층 노트북존").
  room: string;
  // Its free seats for the card's time, null until they are read.
  free: number | null;
  // The seat offered ("7800번"), null while there is none.
  seat: string | null;
  // The room list is open under the ticket.
  open: boolean;
  onRoom: () => void;
  // Opens the seat picture; null while there is no seat or no picture.
  onSeat: (() => void) | null;
}

const CHEVRON = 16;
const DASHES = 12;
export const BORDER = 1.5;
// The cells' top and bottom padding, small enough that the ticket stands whole in the low step's two lines.
export const PAD_Y = 4;
// The seat cell's least width at font size 1, room for a four-digit seat ("7193번") and its chevron, so that the cells
// keep their widths while the seat is read and when it comes.
const SEAT_MIN = 96;
// A value's line, at the phone's font size 1.
export const VALUE_LINE = 20;

// The ticket's height at a font scale: its border, its cells' padding, the label's line and the value's line. The
// card's low step shows two lines of an answer's words (`card-caps.ts`), and the ticket stands there whole.
export function ticketHeightAt(fontScale: number): number {
  return 2 * BORDER + 2 * PAD_Y + (text.caption.lineHeight + VALUE_LINE) * fontScale;
}

// The dashed line between the cells: dashes laid over the line's place and cut off at the ticket's height, so that
// they never make the ticket taller. A booked ticket's are its own colour (P01 ticket 15).
export function Dashes({ tint = color.svcStudy }: { tint?: string }): ReactElement {
  return (
    <View style={styles.divider}>
      <View style={styles.dashes}>
        {Array.from({ length: DASHES }, (_, index) => (
          <View key={index} style={[styles.dash, { backgroundColor: tint }]} />
        ))}
      </View>
    </View>
  );
}

// The right cell: the seat offered, which opens the seat picture. Before the seat is read it holds its label and an
// empty line of the value's height, so that nothing moves when the seat comes.
function SeatCell({ seat, onSeat }: { seat: string | null; onSeat: (() => void) | null }): ReactElement {
  const { fontScale } = useWindowDimensions();
  return (
    <Pressable
      accessibilityLabel={seat === null ? '좌석' : `좌석: ${seat}`}
      accessibilityRole="button"
      accessibilityState={{ disabled: onSeat === null }}
      disabled={onSeat === null}
      onPress={onSeat ?? undefined}
      style={({ pressed }) => [styles.cell, { minWidth: SEAT_MIN * fontScale }, pressed && styles.pressed]}
      testID="seat-ticket-seat"
    >
      <Text style={styles.label}>좌석</Text>
      <View style={styles.line}>
        <Text numberOfLines={1} style={styles.value}>
          {seat ?? ' '}
        </Text>
        {/* Until a seat is known there is nothing to press, so no chevron says there is. */}
        {seat === null ? null : (
          <View testID="seat-ticket-seat-chevron">
            <Icon color={color.svcStudy} name="chevronDown" size={CHEVRON} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

export function SeatTicket({ room, free, seat, open, onRoom, onSeat }: TicketOf): ReactElement {
  const count = free === null ? null : `빈 자리 ${String(free)}석`;
  return (
    <View style={styles.ticket} testID="seat-ticket">
      <Pressable
        accessibilityLabel={`열람실: ${room}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityValue={count === null ? undefined : { text: count }}
        onPress={onRoom}
        style={({ pressed }) => [styles.cell, styles.room, open && styles.open, pressed && styles.pressed]}
      >
        <Text numberOfLines={1} style={styles.label}>
          {count === null ? '열람실' : '열람실 · '}
          {count === null ? null : <Text style={styles.count}>{count}</Text>}
        </Text>
        <View style={[styles.line, styles.roomLine]}>
          <Text numberOfLines={1} style={[styles.value, styles.roomName]}>
            {room}
          </Text>
          <View testID="seat-ticket-room-chevron">
            <Icon color={color.svcStudy} name={open ? 'chevronUp' : 'chevronDown'} size={CHEVRON} />
          </View>
        </View>
      </Pressable>
      <Dashes />
      <SeatCell onSeat={seat === null ? null : onSeat} seat={seat} />
    </View>
  );
}

const styles = StyleSheet.create({
  ticket: {
    flexDirection: 'row',
    borderWidth: BORDER,
    borderColor: color.svcStudy,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    overflow: 'hidden',
  },
  cell: { justifyContent: 'center', paddingVertical: PAD_Y, paddingHorizontal: space[3] },
  room: { flex: 1, minWidth: 0 },
  open: { backgroundColor: color.svcStudySoft },
  pressed: { opacity: 0.6 },
  label: { ...text.caption, color: color.inkMuted },
  count: { fontFamily: font.semiBold, color: color.svcStudy },
  // A value's line: the chevron is centred on its height, at any font scale.
  line: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  roomLine: { justifyContent: 'space-between' },
  // The room and the seat at one size; only the room's name gives way, with "…".
  value: { fontFamily: font.semiBold, fontSize: 15, lineHeight: VALUE_LINE, color: color.ink },
  roomName: { flexShrink: 1 },
  divider: { width: 1.5, alignSelf: 'stretch' },
  dashes: { position: 'absolute', top: space[1], bottom: space[1], left: 0, right: 0, overflow: 'hidden', gap: 3 },
  dash: { height: 4, opacity: 0.45 },
});
