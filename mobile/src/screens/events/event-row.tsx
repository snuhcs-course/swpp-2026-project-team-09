/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-18  Fable 5.2  prompted by AhnJinYoung
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge, color, eventText, eventTone, Icon, type IconName, radius, size, space } from '@/design-system';
import type { EventView } from '@/features/events/adapter';
import { FavoriteToggle } from './favorite-toggle';

// The title and the place take at most two lines each, cut with "…": the detail sheet shows them whole.
const TITLE_LINES = 2;
const PLACE_LINES = 2;

// "모집 중인 파티 {n}" in navy on light blue when a recruiting Quest the User can join is there for the event, "함께 갈
// 파티 찾기" otherwise, the User's own 파티 or not: the old card offered 파티 찾기/모집 on every event.
export function partyWords(recruiting: number): string {
  return recruiting === 0 ? '함께 갈 파티 찾기' : `모집 중인 파티 ${recruiting}`;
}

// The line is drawn 32 high, around its 13-point words; its touch area reaches the design system's 48.
const LINE_HEIGHT = space[8];
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
      <Icon color={tint} name="users" size={15} />
      <Text style={[some ? eventText.party : eventText.partyFind, { color: tint }]}>{partyWords(recruiting)}</Text>
      <Icon color={tint} name="chevronRight" size={14} />
    </Pressable>
  );
}

// The User's own 파티 for the event, as the old card's badge said it. The frame draws none (ticket 54).
// The badge keeps itself at its parent's start, so a box of its own centres it on the line it stands beside.
function MineMark(): ReactElement {
  return (
    <View style={styles.mine}>
      <Badge icon={false} tone="friend">
        내 파티
      </Badge>
    </View>
  );
}

// The time or the place on a line of its own, after the detail sheet's icon for it.
function Fact({ icon, words, lines }: { icon: IconName; words: string; lines: number }): ReactElement {
  return (
    <View style={styles.fact}>
      <View style={styles.factIcon}>
        <Icon color={eventTone.words} name={icon} size={FACT_ICON} testID={`event-icon-${icon}`} />
      </View>
      <Text lineBreakStrategyIOS="hangul-word" numberOfLines={lines} style={styles.line}>
        {words}
      </Text>
    </View>
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

// An event's row on the 행사 tab, as P06 ticket 15's wireframe draws it: the date column, then the title, the time, the
// place and the party line, with the ☆ at the top right. A press opens the detail sheet. The row is
// not one control for a screen reader: its title is the button that opens it, and its party line and ☆ stay
// buttons of their own.
export function EventRow({ event, focused, onLayout, onOpen, onParty }: EventRowProps): ReactElement {
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
      <View style={styles.date}>
        <Text style={styles.day}>{event.date.day}</Text>
        <Text numberOfLines={1} style={styles.dayLine}>
          {event.date.line}
        </Text>
      </View>
      <View style={styles.rule} />
      <View style={styles.body}>
        <Text
          accessibilityRole="button"
          lineBreakStrategyIOS="hangul-word"
          numberOfLines={TITLE_LINES}
          onPress={onOpen}
          style={styles.title}
        >
          {event.title}
        </Text>
        <Fact icon="clock" lines={1} words={event.hours} />
        {event.place === null ? null : <Fact icon="pin" lines={PLACE_LINES} words={event.place} />}
        <View style={styles.partyRow}>
          <PartyLine onPress={onParty} recruiting={event.recruiting} />
          {event.mine ? <MineMark /> : null}
        </View>
      </View>
      <FavoriteToggle eventId={event.id} style={styles.favorite} />
    </Pressable>
  );
}

// The date column's width, which the design system's steps do not hold.
const DATE_WIDTH = 56;
const FACT_ICON = 14;
const ICON_DROP = (eventText.line.lineHeight - FACT_ICON) / 2;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: space[3],
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
  // Clear of the ☆.
  body: { flex: 1, minWidth: 0, gap: space[1], paddingRight: space[8] },
  title: { ...eventText.title, color: color.ink },
  fact: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
  factIcon: { paddingTop: ICON_DROP },
  line: { ...eventText.line, flex: 1, color: eventTone.words },
  party: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space[2],
    height: LINE_HEIGHT,
    borderRadius: radius.md,
  },
  partyRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[1] },
  mine: { alignSelf: 'center', justifyContent: 'center' },
  partySome: { paddingHorizontal: space[3], backgroundColor: color.blue100 },
  // Level with the title's first line.
  favorite: { position: 'absolute', top: 0, right: -space[2] },
});
