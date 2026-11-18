/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge, color, eventText, eventTone, Icon, radius, size, space } from '@/design-system';
import type { EventView } from '@/features/events/adapter';
import { EVENTS_TAB_LOOK, FavoriteToggle } from './favorite-toggle';

// The title and the time·place line take at most this many lines each: a long real title or place stays one short
// row, and the detail sheet shows them whole.
export const ROW_LINES = 2;

// "모집 중인 파티 {n}" in navy on light blue when a recruiting Quest the User can join is there for the event, "함께 갈
// 파티 찾기" otherwise, the User's own 파티 or not: the old card offered 파티 찾기/모집 on every event.
export function partyWords(recruiting: number): string {
  return recruiting === 0 ? '함께 갈 파티 찾기' : `모집 중인 파티 ${recruiting}`;
}

// The line is drawn 40 high, as the frame draws it; its touch area reaches the design system's 48.
const LINE_HEIGHT = space[10];
const SLOP = (size.touchMin - LINE_HEIGHT) / 2;
const HIT_SLOP = { top: SLOP, bottom: SLOP };

function PartyLine({ recruiting, onPress }: { recruiting: number; onPress: () => void }): ReactElement {
  const some = recruiting > 0;
  const tint = some ? color.snuBlue : color.ink;
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={HIT_SLOP}
      onPress={onPress}
      style={[styles.party, some && styles.partySome]}
    >
      <Icon color={tint} name="users" size={18} />
      <Text style={[some ? eventText.party : eventText.partyFind, { color: tint }]}>{partyWords(recruiting)}</Text>
      <Icon color={tint} name="chevronRight" size={16} />
    </Pressable>
  );
}

// The User's own 파티 for the event, as the old card's badge said it. The frame draws none (ticket 54).
export function MineMark(): ReactElement {
  return (
    <Badge icon={false} tone="friend">
      내 파티
    </Badge>
  );
}

interface EventRowProps {
  event: EventView;
  // Opened from elsewhere: a light blue ground.
  focused: boolean;
  onLayout: (y: number) => void;
  onOpen: () => void;
  onParty: () => void;
}

// An event's row on the 행사 tab, as the `Events` frame draws it: the date column, then the source, the title, the time
// and the place, and the party line, with the bookmark at the top right. A press opens the detail sheet. The row is
// not one control for a screen reader: its title is the button that opens it, and its party line and bookmark stay
// buttons of their own.
export function EventRow({ event, focused, onLayout, onOpen, onParty }: EventRowProps): ReactElement {
  const line = event.place === null ? event.hours : `${event.hours} · ${event.place}`;
  return (
    <Pressable
      accessible={false}
      onLayout={({ nativeEvent }) => {
        onLayout(nativeEvent.layout.y);
      }}
      onPress={onOpen}
      style={[styles.row, focused && styles.marked]}
      testID={`event-${event.id}`}
    >
      <View style={[styles.date, { marginTop: event.source === null ? DAY_DROP - SOURCE_STEP : DAY_DROP }]}>
        <Text style={styles.day}>{event.date.day}</Text>
        <Text numberOfLines={1} style={styles.dayLine}>
          {event.date.line}
        </Text>
      </View>
      <View style={styles.rule} />
      <View style={styles.body}>
        {event.source === null ? null : <Text style={styles.source}>{event.source}</Text>}
        <Text
          accessibilityRole="button"
          lineBreakStrategyIOS="hangul-word"
          numberOfLines={ROW_LINES}
          onPress={onOpen}
          style={styles.title}
        >
          {event.title}
        </Text>
        <Text lineBreakStrategyIOS="hangul-word" numberOfLines={ROW_LINES} style={styles.line}>
          {line}
        </Text>
        <View style={styles.partyRow}>
          <PartyLine onPress={onParty} recruiting={event.recruiting} />
          {event.mine ? <MineMark /> : null}
        </View>
      </View>
      <FavoriteToggle eventId={event.id} look={EVENTS_TAB_LOOK} style={styles.bookmark} />
    </Pressable>
  );
}

// The frame's measures that the design system's 4-point steps do not hold: the row's padding, the date column's width
// and the light blue's padding.
const ROW_PADDING = 22;
const DATE_WIDTH = 72;
const PARTY_PADDING = 14;
// The day sits level with the title: lowered by 18 under a source's line, raised by the source's line and the gap
// under it without one.
const DAY_DROP = 18;
const SOURCE_STEP = eventText.source.lineHeight + space[1];

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: ROW_PADDING,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  marked: { backgroundColor: color.blue50 },
  date: { width: DATE_WIDTH },
  day: { ...eventText.day, color: color.ink },
  dayLine: { ...eventText.dayLine, color: color.inkMuted },
  rule: {
    alignSelf: 'stretch',
    width: 1,
    marginVertical: space[1],
    marginRight: space[4],
    backgroundColor: color.border,
  },
  // Clear of the bookmark.
  body: { flex: 1, minWidth: 0, gap: space[1], paddingRight: space[8] },
  source: { ...eventText.source, color: color.inkMuted },
  title: { ...eventText.title, color: color.ink },
  line: { ...eventText.line, color: eventTone.words },
  party: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space[2],
    height: LINE_HEIGHT,
    borderRadius: radius.md,
  },
  partyRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[2] },
  partySome: { paddingHorizontal: PARTY_PADDING, backgroundColor: color.blue100 },
  bookmark: { position: 'absolute', top: space[3], right: -space[2] },
});
