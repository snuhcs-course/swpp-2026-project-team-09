/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, eventText, eventTone, Icon, radius, space } from '@/design-system';
import type { EventView } from '@/features/events/adapter';
import { FavoriteToggle } from './favorite-toggle';

// The title and the time·place line take at most this many lines each: a long real title or place stays one short
// row, and the detail sheet shows them whole.
export const ROW_LINES = 2;

// "모집 중인 파티 {n}" in navy on light blue when any 파티 is there for the event, "함께 갈 파티 찾기" otherwise.
export function partyWords(parties: number): string {
  return parties === 0 ? '함께 갈 파티 찾기' : `모집 중인 파티 ${parties}`;
}

function PartyLine({ parties, onPress }: { parties: number; onPress: () => void }): ReactElement {
  const some = parties > 0;
  const tint = some ? color.snuBlue : color.ink;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.party, some && styles.partySome]}>
      <Icon color={tint} name="users" size={18} />
      <Text style={[some ? eventText.party : eventText.partyFind, { color: tint }]}>{partyWords(parties)}</Text>
      <Icon color={tint} name="chevronRight" size={16} />
    </Pressable>
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
      <View style={styles.date}>
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
        <PartyLine onPress={onParty} parties={event.parties} />
      </View>
      <FavoriteToggle bookmark eventId={event.id} style={styles.bookmark} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 22,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  marked: { backgroundColor: eventTone.marked },
  // The day sits level with the title, under the source's line.
  date: { width: 72, paddingTop: 18 },
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
    height: 40,
    marginTop: space[2],
    borderRadius: radius.md,
  },
  partySome: { paddingHorizontal: 14, backgroundColor: eventTone.chosen },
  bookmark: { position: 'absolute', top: space[3], right: -space[2] },
});
