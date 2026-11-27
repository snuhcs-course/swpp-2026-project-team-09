/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { color, font, Icon, radius, space, text } from '@/design-system';
import { EdgeView } from '../answer/row-edges';

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

// The ticket's left cell, which a seat ticket and a room ticket share (P10 ticket 10): a label with its emphasised part
// over a value that gives way with "…", and a chevron when the cell opens its list. With nothing to open it is no button
// and has no chevron.
export function MainCell({
  label,
  emphasis,
  danger = false,
  value,
  open,
  onPress,
  said,
  testID,
}: {
  label: string;
  // The part after "label · " in the study colour ("빈 자리 171석", "4명"); null for the label alone.
  emphasis: string | null;
  // The emphasised part in the danger colour.
  danger?: boolean;
  value: string;
  open: boolean;
  onPress: (() => void) | null;
  // What a screen reader names the cell, and the emphasis it says after it.
  said: { label: string; value: string | null };
  testID: string;
}): ReactElement {
  return (
    <Pressable
      accessibilityLabel={said.label}
      accessibilityRole="button"
      accessibilityState={{ expanded: open, disabled: onPress === null }}
      accessibilityValue={said.value === null ? undefined : { text: said.value }}
      disabled={onPress === null}
      onPress={onPress ?? undefined}
      style={({ pressed }) => [styles.cell, styles.room, open && styles.open, pressed && styles.pressed]}
      testID={testID}
    >
      <Text numberOfLines={1} style={styles.label}>
        {emphasis === null ? label : `${label} · `}
        {emphasis === null ? null : <Text style={[styles.count, danger && styles.danger]}>{emphasis}</Text>}
      </Text>
      <View style={[styles.line, styles.roomLine]}>
        <Text numberOfLines={1} style={[styles.value, styles.roomName]}>
          {value}
        </Text>
        {onPress === null ? null : (
          <View testID={`${testID}-chevron`}>
            <Icon color={color.svcStudy} name={open ? 'chevronUp' : 'chevronDown'} size={CHEVRON} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

// The ticket's right cell: a label over a value, which opens something when it can. Before the value is known it holds
// its label and an empty line of the value's height, so that nothing moves when the value comes; and with nothing to
// open, no chevron says there is.
export function SideCell({
  label,
  value,
  open = false,
  onPress,
  chevron = onPress !== null,
  testID,
}: {
  label: string;
  value: string | null;
  open?: boolean;
  onPress: (() => void) | null;
  // A seat's chevron shows once the seat is known, even before its picture can open.
  chevron?: boolean;
  testID: string;
}): ReactElement {
  const { fontScale } = useWindowDimensions();
  return (
    <Pressable
      accessibilityLabel={value === null ? label : `${label}: ${value}`}
      accessibilityRole="button"
      accessibilityState={{ disabled: onPress === null, expanded: open }}
      disabled={onPress === null}
      onPress={onPress ?? undefined}
      style={({ pressed }) => [
        styles.cell,
        { minWidth: SEAT_MIN * fontScale },
        open && styles.open,
        pressed && styles.pressed,
      ]}
      testID={testID}
    >
      <Text style={styles.label}>{label}</Text>
      <View style={styles.line}>
        <Text numberOfLines={1} style={styles.value}>
          {value ?? ' '}
        </Text>
        {value === null || !chevron ? null : (
          <View testID={`${testID}-chevron`}>
            <Icon color={color.svcStudy} name={open ? 'chevronUp' : 'chevronDown'} size={CHEVRON} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

// The ticket's frame: one bordered row in the study colour; dimmed while it cannot be acted on.
export function TicketFrame({
  dimmed = false,
  testID,
  children,
}: {
  dimmed?: boolean;
  testID: string;
  children: ReactNode;
}): ReactElement {
  return (
    <EdgeView style={[styles.ticket, dimmed && styles.dimmed]} testID={testID}>
      {children}
    </EdgeView>
  );
}

export function SeatTicket({ room, free, seat, open, onRoom, onSeat }: TicketOf): ReactElement {
  const count = free === null ? null : `빈 자리 ${String(free)}석`;
  return (
    <TicketFrame testID="seat-ticket">
      <MainCell
        emphasis={count}
        label="열람실"
        onPress={onRoom}
        open={open}
        said={{ label: `열람실: ${room}`, value: count }}
        testID="seat-ticket-room"
        value={room}
      />
      <Dashes />
      <SideCell
        chevron={seat !== null}
        label="좌석"
        onPress={seat === null ? null : onSeat}
        testID="seat-ticket-seat"
        value={seat}
      />
    </TicketFrame>
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
  danger: { color: color.danger },
  // A ticket that cannot be acted on yet (P10 ticket 10's group study room short of people).
  dimmed: { opacity: 0.45 },
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
