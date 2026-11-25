/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { router } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { type LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { MealInput, TimeBand } from '@/api/assistant-types';
import type { BandLane } from '@/api/time-band-types';
import { color, font, Icon, radius, space, text } from '@/design-system';
import { type PickRow, pickStateOf } from '@/features/assistant/people-picking';
import { foldedRangeOf, type Stretch } from '@/features/assistant/time-band';
import { placeOf, redOf } from './band-body';
import { Red } from './band-track';

// The open time card's row for each person (P04 ticket 61, board p2, variant A): the name as a small caption over the
// left end of the person's own bar, and every bar over the same free time around the span as the bar of everyone above
// it, with the same ends and scale, so that a time lies straight down through them all. Each bar shows its person's
// busy stretches, cut at the bar's ends, and the band's outline. Up to four people the rows show whole; with more, their
// room is four and a half rows, the half row at its bottom edge showing there are more, and the rows scroll in it while
// the card's head above and its grip's strip below stay. The rows only scroll: the card's drag is its strip's. Folded,
// the rows take no room and a screen reader passes them by. While people are picked (P04 ticket 64, variant R3) each
// Friend has one line with no bar, a check, the name, the department, and one thing at its right, the walk, the reason
// they are busy, or "위치 모름"; five rows show whole, then five and a half. A press checks or unchecks it.

const BAR_HEIGHT = 8;
const LANE_HEIGHT = 12;
const ROWS_TOP = space[2];
const ROW_GAP = space[2];
const MOST_ROWS = 4;
// While picking (variant R3): rows 36 high with no gap, five whole and then five and a half, 206 with the top.
const PICK_ROW = 36;
const PICK_MOST = 5;
// The kit's rings of a check not yet picked, a free Friend's and a busy one's; the app's tokens have none so light.
const CHECK_RING = '#C3C8D4';
const CHECK_RING_QUIET = '#D9DDE7';

// The rows' room open, from their whole height laid out: all of them up to `most` people, else that many and a half.
export function rowsRoomOf(whole: number, count: number, most: number = MOST_ROWS, gap: number = ROW_GAP): number {
  if (count <= most) {
    return whole;
  }
  const row = (whole - ROWS_TOP - (count - 1) * gap) / count;
  return ROWS_TOP + most * (row + gap) + row / 2;
}

// The rows while people are picked: a row for the User and each Friend (`pickRowsOf`), and the press on one.
export interface Picking {
  rows: readonly PickRow[];
  onPick: (userId: string) => void;
}

interface PersonRowsProps {
  band: TimeBand;
  // Left out, the rows of the Plan's people.
  picking?: Picking | null;
  // Where the band is drawn now.
  shown: Stretch;
  fixed: MealInput['window'];
  moving: Stretch | null;
  hidden: boolean;
  // The rows' room, which the card grows by open.
  onHeight: (height: number) => void;
}

interface LaneParts {
  band: TimeBand;
  range: TimeBand['range'];
  fixed: MealInput['window'];
  moving: Stretch | null;
  outline: Stretch;
}

// A person's bar: their busy stretches, cut at the bar's ends, the clashes red, and the band's outline. Picking shows
// none: its rows are the people alone, and the combined bar on top changes with each check (the user, 2026-11-25).
function Lane({ lane, parts }: { lane: BandLane; parts: LaneParts }): ReactElement {
  const { band, range, fixed, moving, outline } = parts;
  return (
    <View style={styles.lane}>
      <View style={styles.bar}>
        {lane.busy.map((stretch) => (
          <View
            key={`busy-${stretch.startAt}`}
            style={[styles.busy, placeOf(stretch, range)]}
            testID="time-card-busy"
          />
        ))}
        <Red range={range} stretches={redOf(lane, fixed, band, moving)} />
      </View>
      <View style={[styles.outline, placeOf(outline, range)]} />
    </View>
  );
}

// A person's row out of picking: the name as a small caption over their bar.
function PersonLine({ lane, parts }: { lane: BandLane; parts: LaneParts }): ReactElement {
  return (
    <View style={styles.row}>
      <Text numberOfLines={1} style={styles.name}>
        {lane.name}
      </Text>
      <Lane lane={lane} parts={parts} />
    </View>
  );
}

// A Friend's row while picking: the check, the name, the department, and the state at the right; a press checks or
// unchecks it. Its final look (a line or two, a busy Friend's reason and grey) waits for the boards.
function PickLine({ row, onPick }: { row: PickRow; onPick: Picking['onPick'] }): ReactElement {
  const { userId, name, checked, department } = row;
  const state = pickStateOf(row);
  // Busy over the span and not picked: the row reads quieter, and can still be picked.
  const quiet = row.busyAtSpan !== null && !checked;
  return (
    <Pressable
      accessibilityLabel={`${name} · ${state.words}`}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => {
        onPick(userId);
      }}
      style={styles.pick}
      testID={`time-card-pick-${userId}`}
    >
      <View style={[styles.check, quiet && styles.quietCheck, checked && styles.checked]}>
        {checked ? <Icon color={color.onPrimary} name="check" size={12} /> : null}
      </View>
      <Text style={[styles.pickName, checked && styles.pickedName, quiet && styles.quietWords]}>{name}</Text>
      <Text numberOfLines={1} style={[styles.department, quiet && styles.quietWords]}>
        {department ?? ''}
      </Text>
      <Text style={[styles.state, state.quiet && styles.quietWords]}>{state.words}</Text>
    </Pressable>
  );
}

// With no Friend to pick, one line that says so and leads to adding one (board p20).
function NoFriends(): ReactElement {
  return (
    <View style={styles.pick} testID="time-card-no-friends">
      <Text style={styles.noFriends}>아직 친구가 없어요</Text>
      <Pressable
        accessibilityRole="link"
        onPress={() => {
          router.push('/me/friends/add');
        }}
        style={styles.addFriend}
      >
        <Text style={styles.add}>친구 추가 ›</Text>
      </Pressable>
    </View>
  );
}

export function PersonRows(props: PersonRowsProps): ReactElement {
  const { band, picking = null, shown, fixed, moving, hidden, onHeight } = props;
  const parts = { band, range: foldedRangeOf(band), fixed, moving, outline: moving ?? shown };
  const count = picking === null ? band.lanes.length : picking.rows.length;
  const [most, gap]: [number, number] = picking === null ? [MOST_ROWS, ROW_GAP] : [PICK_MOST, 0];
  const many = count > most;
  const [room, setRoom] = useState<number | null>(null);
  return (
    <ScrollView
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      scrollEnabled={many}
      showsVerticalScrollIndicator={many}
      style={[styles.scroll, room === null ? null : { height: room }]}
      testID="time-card-rows-room"
    >
      <View
        onLayout={({ nativeEvent }: LayoutChangeEvent) => {
          const next = rowsRoomOf(nativeEvent.layout.height, count, most, gap);
          setRoom(next);
          onHeight(next);
        }}
        style={[styles.rows, { gap }]}
        testID="time-card-rows"
      >
        {picking === null ? band.lanes.map((lane) => <PersonLine key={lane.userId} lane={lane} parts={parts} />) : null}
        {picking !== null && picking.rows.length === 0 ? <NoFriends /> : null}
        {picking === null
          ? null
          : picking.rows.map((row) => <PickLine key={row.userId} onPick={picking.onPick} row={row} />)}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Laid out at its own height wherever the card's room is, so that its height is known before the card opens.
  scroll: { position: 'absolute', top: 0, right: 0, left: 0 },
  rows: { gap: ROW_GAP, paddingTop: ROWS_TOP },
  row: { gap: space[1] },
  name: { ...text.caption, color: color.inkMuted },
  // Variant R3 of the boards (the user's choice, 2026-11-25): one line 36 high, the whole of it the press.
  pick: { flexDirection: 'row', alignItems: 'center', gap: space[2], height: PICK_ROW },
  check: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderColor: CHECK_RING,
    borderRadius: radius.full,
  },
  quietCheck: { borderColor: CHECK_RING_QUIET },
  checked: { borderColor: color.snuBlue, backgroundColor: color.snuBlue },
  // Never cut; 600 once picked.
  pickName: { fontFamily: font.medium, fontSize: 13.5, lineHeight: 20, flexShrink: 0, color: color.ink },
  pickedName: { fontFamily: font.semiBold },
  // The only words cut, with …, before the one at the right.
  department: { ...text.caption, flex: 1, color: color.inkMuted },
  state: { ...text.caption, flexShrink: 0, color: color.inkMuted },
  quietWords: { color: color.inkSubtle },
  noFriends: { fontFamily: font.medium, fontSize: 13.5, lineHeight: 20, flex: 1, color: color.inkMuted },
  addFriend: {
    paddingHorizontal: space[3],
    paddingVertical: space[1],
    borderWidth: 1.5,
    borderColor: color.snuBlue,
    borderRadius: radius.full,
  },
  add: { ...text.label, color: color.snuBlue },
  lane: { height: LANE_HEIGHT, justifyContent: 'center' },
  bar: { height: BAR_HEIGHT, borderRadius: radius.full, backgroundColor: color.surfaceSunken },
  busy: { position: 'absolute', top: 0, bottom: 0, borderRadius: radius.full, backgroundColor: color.borderStrong },
  outline: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderWidth: 1.5,
    borderColor: color.quest,
    borderRadius: radius.sm,
    opacity: 0.5,
  },
});
