/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { type ReactElement, type ReactNode, useState } from 'react';
import { Keyboard, Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { placesQuery } from '@/api/queries';
import { Badge, color, font, Icon, type IconName, radius, space } from '@/design-system';
import type { FormEvent } from '@/features/party/making';
import type { PickedPlace } from '@/features/places/picked-place';
import { type PlaceKind, placeKindOf, placeToSend } from '@/features/places/typed-place';
import { DateTimeSheet, whenWords } from '../../date-time-sheet';
import { PlaceSheet } from './place-sheet';

// The 파티 form's box of the time, the place and the event, as the 모집글 shows them: a row each, an icon and the value
// with no label, which opens its sheet.

function rowStyle({ pressed }: { pressed: boolean }): StyleProp<ViewStyle> {
  return [styles.row, pressed && styles.pressed];
}

interface RowProps {
  icon: IconName;
  // What a screen reader says: "언제 오늘 21:00".
  label: string;
  words: string;
  // Nothing chosen yet: the words are the grey hint.
  unset: boolean;
  onPress: () => void;
  // The value in navy, as the chosen event's title.
  navy?: boolean;
  badge?: ReactNode;
}

// The keyboard goes first, so that the sheet is never behind it.
function Row({ icon, label, words, unset, onPress, navy = false, badge }: RowProps): ReactElement {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={() => {
        Keyboard.dismiss();
        onPress();
      }}
      style={rowStyle}
    >
      <Icon color={unset ? color.inkSubtle : color.inkMuted} name={icon} size={ICON} />
      <Text numberOfLines={1} style={[styles.words, navy && styles.navy, unset && styles.unset]}>
        {words}
      </Text>
      {badge}
      <Icon color={color.inkSubtle} name="chevronRight" size={CHEVRON} />
    </Pressable>
  );
}

function TimeRow({ startsAt, onPick }: { startsAt: string | null; onPick: (instant: string) => void }): ReactElement {
  const [picking, setPicking] = useState(false);
  const words = startsAt === null ? '날짜·시간 선택' : whenWords(startsAt);
  return (
    <>
      <Row
        icon="clock"
        label={`언제 ${words}`}
        onPress={() => {
          setPicking(true);
        }}
        unset={startsAt === null}
        words={words}
      />
      <DateTimeSheet
        onClose={() => {
          setPicking(false);
        }}
        onPick={onPick}
        open={picking}
        value={startsAt}
      />
    </>
  );
}

const BADGES: Record<PlaceKind, ReactElement> = {
  building: (
    <Badge icon="check" tone="official">
      건물
    </Badge>
  ),
  point: (
    <Badge icon="map" tone="official">
      지도
    </Badge>
  ),
  words: <Badge tone="neutral">직접 입력</Badge>,
};

// What the place will be sent as, which its badge says. Typed words are named against the list of Places, asked only
// for them.
function usePlaceKind(words: string, picked: PickedPlace | null): PlaceKind | null {
  const typedAlone = picked === null && words.trim() !== '';
  const places = useQuery({ ...placesQuery, enabled: typedAlone }).data ?? [];
  const sent = placeToSend(words, picked, places);
  return sent === undefined ? null : placeKindOf(sent);
}

interface PlaceRowProps {
  words: string;
  picked: PickedPlace | null;
  onWords: (words: string) => void;
  onPicked: (place: PickedPlace | null) => void;
}

// The place with its badge: 건물, 지도, or 직접 입력 with the line that says what words alone cannot do.
function PlaceRow({ words, picked, onWords, onPicked }: PlaceRowProps): ReactElement {
  const [picking, setPicking] = useState(false);
  const kind = usePlaceKind(words, picked);
  const shown = words.trim() === '' ? '장소 검색' : words;
  return (
    <View testID="place-row">
      <Row
        badge={kind === null ? null : BADGES[kind]}
        icon="pin"
        label={`어디서 ${shown}`}
        onPress={() => {
          setPicking(true);
        }}
        unset={kind === null}
        words={shown}
      />
      {kind === 'words' ? <Text style={styles.under}>지도·도보 시간·도착 알림에 쓰이지 않아요</Text> : null}
      <PlaceSheet
        onClose={() => {
          setPicking(false);
        }}
        onPicked={(place) => {
          onPicked(place);
          onWords(place.words);
        }}
        onTyped={(typed) => {
          onPicked(null);
          onWords(typed);
        }}
        open={picking}
        words={words}
      />
    </View>
  );
}

interface EventRowProps {
  event: FormEvent | null;
  // The edited Quest's own event, which the main server cannot change.
  locked: boolean;
  onChoose: () => void;
}

// The event's title in navy, which opens the picker; an edited Quest's own event with a lock and no way to it.
function EventRow({ event, locked, onChoose }: EventRowProps): ReactElement {
  if (event !== null && locked) {
    return (
      <View style={styles.row}>
        <Icon color={color.inkMuted} name="calendar" size={ICON} />
        <Text numberOfLines={1} style={[styles.words, styles.navy]}>
          {event.title}
        </Text>
        <Icon color={color.inkSubtle} label="바꿀 수 없어요" name="lock" size={CHEVRON} />
      </View>
    );
  }
  return (
    <Row
      icon="calendar"
      label={event === null ? '관련 행사 고르기' : `관련 행사 ${event.title}`}
      navy={event !== null}
      onPress={onChoose}
      unset={event === null}
      words={event?.title ?? '관련 행사 고르기'}
    />
  );
}

interface PlanBoxProps {
  startsAt: string | null;
  onTime: (instant: string) => void;
  place: PlaceRowProps;
  event: EventRowProps;
}

export function PlanBox({ startsAt, onTime, place, event }: PlanBoxProps): ReactElement {
  return (
    <View style={styles.box} testID="plan-box">
      <TimeRow onPick={onTime} startsAt={startsAt} />
      <View style={styles.rule} />
      <PlaceRow {...place} />
      <View style={styles.rule} />
      <EventRow {...event} />
    </View>
  );
}

const ICON = 18;
const CHEVRON = 16;

const styles = StyleSheet.create({
  box: { overflow: 'hidden', borderRadius: radius.md, backgroundColor: color.surfaceSubtle },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 46, paddingHorizontal: 14 },
  pressed: { backgroundColor: color.surfaceSunken },
  rule: { height: 1, marginHorizontal: 14, backgroundColor: color.border },
  words: { flex: 1, minWidth: 0, fontFamily: font.medium, fontSize: 15, lineHeight: 22, color: color.ink },
  navy: { color: color.snuBlue },
  unset: { fontFamily: font.regular, color: color.inkSubtle },
  under: {
    marginTop: -space[2],
    paddingBottom: space[2],
    paddingLeft: 14 + ICON + 10,
    paddingRight: 14,
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 16,
    color: color.inkMuted,
  },
});
