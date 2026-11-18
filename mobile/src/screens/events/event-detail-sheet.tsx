/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomSheet, Button, color, eventText, eventTone, Icon, type IconName, radius, space } from '@/design-system';
import type { EventView } from '@/features/events/adapter';
import { FavoriteToggle } from './favorite-toggle';

// "파티 찾기/모집", or "모집 중인 파티 {n} · 찾기/모집" when any 파티 is there for the event.
export function detailPartyWords(parties: number): string {
  return parties === 0 ? '파티 찾기/모집' : `모집 중인 파티 ${parties} · 찾기/모집`;
}

function Fact({ icon, name, words }: { icon: IconName; name: string; words: string }): ReactElement {
  return (
    <View style={styles.fact}>
      <View style={styles.factIcon}>
        <Icon color={color.inkMuted} name={icon} size={18} />
      </View>
      <Text style={styles.key}>{name}</Text>
      <Text lineBreakStrategyIOS="hangul-word" style={styles.value}>
        {words}
      </Text>
    </View>
  );
}

function Details({ event }: { event: EventView }): ReactElement {
  return (
    <ScrollView contentContainerStyle={styles.details} style={styles.scroll}>
      <View style={styles.head}>
        <View style={styles.names}>
          {event.source === null ? null : <Text style={styles.source}>{event.source}</Text>}
          <Text accessibilityRole="header" lineBreakStrategyIOS="hangul-word" style={styles.title}>
            {event.title}
          </Text>
        </View>
        <FavoriteToggle bookmark eventId={event.id} style={styles.bookmark} />
      </View>
      <View style={styles.facts}>
        <Fact icon="clock" name="언제" words={event.time} />
        {event.place === null ? null : <Fact icon="pin" name="어디" words={event.place} />}
      </View>
      {event.description === '' ? null : (
        <Text lineBreakStrategyIOS="hangul-word" style={styles.description}>
          {event.description}
        </Text>
      )}
    </ScrollView>
  );
}

interface EventDetailSheetProps {
  event: EventView | null;
  onClose: () => void;
  onParty: (event: EventView) => void;
}

// The `EventsDetail` frame: a pressed row's event in a sheet, with its time and place, its description, "원문 보기",
// which opens its page in the browser and is left out without one, and the 파티 for it. The top part scrolls when the
// description is long, the buttons staying under it.
export function EventDetailSheet({ event, onClose, onParty }: EventDetailSheetProps): ReactElement {
  const sourceUrl = event?.sourceUrl ?? null;
  return (
    <BottomSheet label={event?.title ?? '행사'} onClose={onClose} open={event !== null}>
      {event === null ? null : (
        <View style={styles.body}>
          <Details event={event} />
          <View style={styles.actions}>
            {sourceUrl === null ? null : (
              <Button
                icon="globe"
                onPress={() => {
                  void Linking.openURL(sourceUrl);
                }}
                size="lg"
                variant="secondary"
              >
                원문 보기
              </Button>
            )}
            <View style={styles.grow}>
              <Button
                full
                icon="users"
                onPress={() => {
                  onParty(event);
                }}
                size="lg"
              >
                {detailPartyWords(event.parties)}
              </Button>
            </View>
          </View>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { flexShrink: 1, gap: space[4], paddingHorizontal: space[5], paddingBottom: space[1] },
  scroll: { flexGrow: 0, flexShrink: 1 },
  details: { gap: space[4] },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
  names: { flex: 1, minWidth: 0, gap: space[1] },
  source: { ...eventText.source, color: color.inkMuted },
  title: { ...eventText.sheetTitle, color: color.ink },
  bookmark: { marginTop: -6, marginRight: -10 },
  facts: {
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: space[4],
    borderRadius: radius.lg,
    backgroundColor: color.surfaceSubtle,
  },
  fact: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  factIcon: { paddingTop: 2 },
  key: { ...eventText.key, width: 36, color: color.inkFaint },
  value: { ...eventText.value, flex: 1, color: color.ink },
  description: { ...eventText.description, color: eventTone.words },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  grow: { flex: 1 },
});
