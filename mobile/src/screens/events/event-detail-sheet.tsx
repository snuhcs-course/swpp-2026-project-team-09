/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-18  Fable 5.2  prompted by AhnJinYoung
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomSheet, Button, color, eventText, eventTone, Icon, type IconName, radius, space } from '@/design-system';
import type { EventView } from '@/features/events/adapter';
import { type DescriptionLine, descriptionLines } from './description-lines';
import { FavoriteToggle } from './favorite-toggle';

// "파티 찾기/모집", or "모집 중인 파티 {n} · 찾기/모집" when a recruiting Quest the User can join is there for the event,
// as the row counts them.
export function detailPartyWords(recruiting: number): string {
  return recruiting === 0 ? '파티 찾기/모집' : `모집 중인 파티 ${recruiting} · 찾기/모집`;
}

// The icon names the value on the screen, and `name` names it to a screen reader.
function Fact({ icon, name, words }: { icon: IconName; name: string; words: string }): ReactElement {
  return (
    <View accessibilityLabel={`${name}, ${words}`} accessible style={styles.fact}>
      <View style={styles.factIcon}>
        <Icon color={color.inkMuted} name={icon} size={FACT_ICON} />
      </View>
      <Text lineBreakStrategyIOS="hangul-word" style={styles.value}>
        {words}
      </Text>
    </View>
  );
}

// A block per line of the text, each run of blank lines one wider gap.
function Description({ lines }: { lines: DescriptionLine[] }): ReactElement {
  return (
    <View testID="event-description">
      {lines.map(({ words, afterBlank }, index) => (
        <Text
          key={index}
          lineBreakStrategyIOS="hangul-word"
          style={[styles.description, { marginTop: index === 0 ? 0 : afterBlank ? PARAGRAPH_GAP : LINE_GAP }]}
        >
          {words}
        </Text>
      ))}
    </View>
  );
}

function Details({ event }: { event: EventView }): ReactElement {
  const lines = descriptionLines(event.description);
  return (
    <ScrollView contentContainerStyle={styles.details} style={styles.scroll} testID="event-detail">
      <View style={styles.head}>
        <Text accessibilityRole="header" lineBreakStrategyIOS="hangul-word" style={styles.title}>
          {event.title}
        </Text>
        <FavoriteToggle eventId={event.id} style={styles.favorite} />
      </View>
      <View style={styles.facts}>
        <Fact icon="clock" name="언제" words={event.time} />
        {event.place === null ? null : <Fact icon="pin" name="어디" words={event.place} />}
      </View>
      {lines.length === 0 ? null : <Description lines={lines} />}
    </ScrollView>
  );
}

// The foot's button beside "원문 보기": the 행사 tab's party button, or 파티 만들기's "이 행사 추가", a grey "선택됨" that
// takes no press for the event chosen already.
export type SheetAction =
  | { kind: 'party'; onPress: (event: EventView) => void }
  | { kind: 'add'; chosen: boolean; onPress: (event: EventView) => void };

function ActionButton({ event, action }: { event: EventView; action: SheetAction }): ReactElement {
  const press = (): void => {
    action.onPress(event);
  };
  if (action.kind === 'party') {
    return (
      <Button full icon="users" onPress={press} size="lg">
        {detailPartyWords(event.recruiting)}
      </Button>
    );
  }
  return action.chosen ? (
    <Button disabled full icon="check" size="lg">
      선택됨
    </Button>
  ) : (
    <Button full icon="plus" onPress={press} size="lg">
      이 행사 추가
    </Button>
  );
}

interface ActionsProps {
  event: EventView;
  action?: SheetAction;
}

// "원문 보기", which opens the event's page in the browser and is left out without one, and the sheet's action, left
// out where it is given none. A button alone spans the sheet; without either the sheet has no foot.
function Actions({ event, action }: ActionsProps): ReactElement | null {
  const { sourceUrl } = event;
  const alone = action === undefined;
  if (sourceUrl === null && alone) {
    return null;
  }
  const page =
    sourceUrl === null ? null : (
      <Button
        full={alone}
        icon="globe"
        onPress={() => {
          void Linking.openURL(sourceUrl);
        }}
        size="lg"
        variant="secondary"
      >
        원문 보기
      </Button>
    );
  return (
    <View style={styles.actions}>
      {alone ? <View style={styles.grow}>{page}</View> : page}
      {alone ? null : (
        <View style={styles.grow}>
          <ActionButton action={action} event={event} />
        </View>
      )}
    </View>
  );
}

interface EventDetailSheetProps {
  event: EventView | null;
  onClose: () => void;
  // Left out in a Quest's room, whose User is in a 파티 for the event already: the sheet then has only "원문 보기".
  action?: SheetAction;
}

// The `EventsDetail` frame: an event in a sheet, with its time and place, its description, "원문 보기" and the button
// of the screen that opened it. The top part scrolls when the description is long, the buttons staying under it.
export function EventDetailSheet({ event, onClose, action }: EventDetailSheetProps): ReactElement {
  return (
    <BottomSheet label={event?.title ?? '행사'} onClose={onClose} open={event !== null}>
      {event === null ? null : (
        <View style={styles.body}>
          <Details event={event} />
          <Actions action={action} event={event} />
        </View>
      )}
    </BottomSheet>
  );
}

// The `EventsDetail` frame's measures that the design system's 4-point steps do not hold: the gaps and padding of the
// time and place box, how far the ☆'s touch area reaches past the title's corner, and the description's gaps between
// lines and across blank lines (ticket 14).
const BOX_GAP = 10;
const BOX_PADDING = 14;
const FACT_ICON = 18;
const ICON_DROP = (eventText.value.lineHeight - FACT_ICON) / 2;
const FAVORITE_REACH = { marginTop: -6, marginRight: -10 };
const LINE_GAP = 7;
const PARAGRAPH_GAP = 14;

const styles = StyleSheet.create({
  body: { flexShrink: 1, gap: space[4], paddingHorizontal: space[5], paddingBottom: space[1] },
  scroll: { flexGrow: 0, flexShrink: 1 },
  details: { gap: space[4] },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
  title: { ...eventText.sheetTitle, flex: 1, minWidth: 0, color: color.ink },
  favorite: FAVORITE_REACH,
  facts: {
    gap: BOX_GAP,
    paddingVertical: BOX_PADDING,
    paddingHorizontal: space[4],
    borderRadius: radius.lg,
    backgroundColor: color.surfaceSubtle,
  },
  fact: { flexDirection: 'row', alignItems: 'flex-start', gap: BOX_GAP },
  factIcon: { paddingTop: ICON_DROP },
  value: { ...eventText.value, flex: 1, color: color.ink },
  description: { ...eventText.description, color: eventTone.words },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  grow: { flex: 1 },
});
