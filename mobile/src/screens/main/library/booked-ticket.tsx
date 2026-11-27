/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, font, Icon, radius, space, text } from '@/design-system';
import { seeThrough } from '@/design-system/see-through';
import type { TicketView } from '@/library/cards/bookings';
import { BORDER, Dashes, PAD_Y, VALUE_LINE } from './seat-ticket';

// A booking's ticket (P01 ticket 15): the seat card's ticket at its size, on a light sky ground once booked or in use,
// grey once it ended. Its left label says how it stands and when, its value the room; its right cell the seat. Its
// cells open nothing. Under it, one faint line, with a link at its right.

interface Look {
  ground: string;
  border: string;
  word: string;
  ink: string;
  muted: string;
}

const LIVE: Look = {
  ground: color.svcStudySoft,
  border: seeThrough(color.svcStudy, 0.35),
  word: color.svcStudy,
  ink: color.ink,
  muted: color.inkMuted,
};

const LOOKS: Record<TicketView['state'], Look> = {
  booked: LIVE,
  using: LIVE,
  ended: {
    ground: color.surfaceSubtle,
    border: color.border,
    word: color.inkSubtle,
    ink: color.inkSubtle,
    muted: color.inkSubtle,
  },
};

const CHECK = 14;

// The ticket's words read as one.
export function ticketWords({ word, when, room, unit, seat }: TicketView): string {
  return `${word} · ${when}, ${room}, ${unit} ${seat}`;
}

function Cells({ ticket }: { ticket: TicketView }): ReactElement {
  const look = LOOKS[ticket.state];
  return (
    <>
      <View style={[styles.cell, styles.room]}>
        <View style={styles.labelRow}>
          {ticket.state === 'booked' ? (
            <View style={styles.check}>
              <Icon color={color.surface} name="check" size={CHECK - 4} />
            </View>
          ) : null}
          <Text numberOfLines={1} style={[styles.label, { color: look.muted }]}>
            <Text style={[styles.word, { color: look.word }]}>{ticket.word}</Text>
            {` · ${ticket.when}`}
          </Text>
        </View>
        <Text numberOfLines={1} style={[styles.value, { color: look.ink }]}>
          {ticket.room}
        </Text>
      </View>
      <Dashes tint={look.word} />
      <View style={styles.cell}>
        <Text style={[styles.label, { color: look.muted }]}>{ticket.unit}</Text>
        <Text numberOfLines={1} style={[styles.value, { color: look.ink }]}>
          {ticket.seat}
        </Text>
      </View>
    </>
  );
}

// One of several to choose from is pressed to choose it (`onChoose`), as a radio button.
export function BookedTicket({
  ticket,
  onChoose = null,
  chosen = false,
}: {
  ticket: TicketView;
  onChoose?: (() => void) | null;
  chosen?: boolean;
}): ReactElement {
  const look = LOOKS[ticket.state];
  const frame = [styles.ticket, { backgroundColor: look.ground, borderColor: chosen ? color.svcStudy : look.border }];
  if (onChoose === null) {
    return (
      <View accessibilityLabel={ticketWords(ticket)} accessible style={frame} testID="booked-ticket">
        <Cells ticket={ticket} />
      </View>
    );
  }
  return (
    <Pressable
      accessibilityLabel={ticketWords(ticket)}
      accessibilityRole="radio"
      accessibilityState={{ checked: chosen }}
      onPress={onChoose}
      style={({ pressed }) => [frame, pressed && styles.pressed]}
      testID="booked-ticket"
    >
      <Cells ticket={ticket} />
    </Pressable>
  );
}

// The faint line under a ticket: the time to confirm the seat, and a link at its right ("예약 취소 ›").
export function TicketLine({
  words,
  link,
}: {
  words: string | null;
  link: { words: string; onPress: () => void } | null;
}): ReactElement | null {
  if (words === null && link === null) {
    return null;
  }
  return (
    <View style={styles.line}>
      <Text numberOfLines={1} style={styles.lineWords}>
        {words ?? ''}
      </Text>
      {link === null ? null : (
        <Pressable accessibilityRole="button" hitSlop={space[2]} onPress={link.onPress}>
          <Text style={styles.link}>{`${link.words} ›`}</Text>
        </Pressable>
      )}
    </View>
  );
}

// A ticket with its line under it.
export function TicketWithLine({ children }: { children: ReactNode }): ReactElement {
  return <View style={styles.withLine}>{children}</View>;
}

const styles = StyleSheet.create({
  ticket: { flexDirection: 'row', borderWidth: BORDER, borderRadius: radius.md, overflow: 'hidden' },
  pressed: { opacity: 0.6 },
  cell: { justifyContent: 'center', paddingVertical: PAD_Y, paddingHorizontal: space[3] },
  room: { flex: 1, minWidth: 0 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  check: {
    width: CHECK,
    height: CHECK,
    borderRadius: CHECK / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.svcStudy,
  },
  label: { ...text.caption, flexShrink: 1 },
  word: { fontFamily: font.semiBold },
  value: { fontFamily: font.semiBold, fontSize: 15, lineHeight: VALUE_LINE },
  withLine: { gap: space[1] },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] },
  lineWords: { ...text.caption, flexShrink: 1, color: color.inkSubtle },
  link: { ...text.caption, fontFamily: font.semiBold, color: color.snuBlue },
});
