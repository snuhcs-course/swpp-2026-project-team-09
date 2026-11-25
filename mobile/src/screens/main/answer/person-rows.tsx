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
import { color, Icon, radius, space, text } from '@/design-system';
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
// the rows take no room and a screen reader passes them by. While people are picked (P04 ticket 64) each row has a
// check, the name, and the walk to the Plan's place at its right, and a press checks or unchecks it; 나 stays checked.

const BAR_HEIGHT = 8;
const LANE_HEIGHT = 12;
const ROWS_TOP = space[2];
const ROW_GAP = space[2];
const MOST_ROWS = 4;

// The rows' room open, from their whole height laid out: all of them up to `MOST_ROWS` people, else four and a half.
export function rowsRoomOf(whole: number, count: number): number {
  if (count <= MOST_ROWS) {
    return whole;
  }
  const row = (whole - ROWS_TOP - (count - 1) * ROW_GAP) / count;
  return ROWS_TOP + MOST_ROWS * (row + ROW_GAP) + row / 2;
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

// A person's bar: their busy stretches, cut at the bar's ends, the clashes red, and the band's outline. A Friend not
// checked while picking has a quiet bar: lighter stretches, no clashes, and no outline (boards p2–p6).
function Lane({ lane, parts, quiet = false }: { lane: BandLane; parts: LaneParts; quiet?: boolean }): ReactElement {
  const { band, range, fixed, moving, outline } = parts;
  return (
    <View style={styles.lane}>
      <View style={styles.bar}>
        {lane.busy.map((stretch) => (
          <View
            key={`busy-${stretch.startAt}`}
            style={[styles.busy, quiet && styles.quietBusy, placeOf(stretch, range)]}
            testID="time-card-busy"
          />
        ))}
        {quiet ? null : <Red range={range} stretches={redOf(lane, fixed, band, moving)} />}
      </View>
      {quiet ? null : <View style={[styles.outline, placeOf(outline, range)]} />}
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

// A Friend's row while picking: the check, the name, the state at the right, and the bar when the main server sent
// the Friend's lane; a press checks or unchecks it. 나 has the row of everyone's, with no check.
function PickLine({ row, parts, onPick }: { row: PickRow; parts: LaneParts; onPick: Picking['onPick'] }): ReactElement {
  const { userId, name, me, checked, busy, department } = row;
  if (me) {
    return <PersonLine lane={{ userId, name, busy: busy ?? [] }} parts={parts} />;
  }
  const state = pickStateOf(row);
  return (
    <Pressable
      accessibilityLabel={`${name} · ${state}`}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => {
        onPick(userId);
      }}
      style={styles.row}
      testID={`time-card-pick-${userId}`}
    >
      <View style={styles.head}>
        <View style={[styles.check, checked && styles.checked]}>
          {checked ? <Icon color={color.onPrimary} name="check" size={12} /> : null}
        </View>
        <Text numberOfLines={1} style={[styles.pickName, !checked && styles.quietName]}>
          {name}
        </Text>
        <Text numberOfLines={1} style={styles.department}>
          {department ?? ''}
        </Text>
        <Text style={styles.state}>{state}</Text>
      </View>
      {busy === null ? null : <Lane lane={{ userId, name, busy }} parts={parts} quiet={!checked} />}
    </Pressable>
  );
}

// With no Friend to pick, one line that says so and leads to adding one (board p20).
function NoFriends(): ReactElement {
  return (
    <View style={styles.head} testID="time-card-no-friends">
      <Text style={styles.pickName}>아직 친구가 없어요</Text>
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
  const many = count > MOST_ROWS;
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
          const next = rowsRoomOf(nativeEvent.layout.height, count);
          setRoom(next);
          onHeight(next);
        }}
        style={styles.rows}
        testID="time-card-rows"
      >
        {picking === null ? band.lanes.map((lane) => <PersonLine key={lane.userId} lane={lane} parts={parts} />) : null}
        {picking !== null && picking.rows.length <= 1 ? <NoFriends /> : null}
        {picking !== null && picking.rows.length > 1
          ? picking.rows.map((row) => <PickLine key={row.userId} onPick={picking.onPick} parts={parts} row={row} />)
          : null}
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
  head: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  check: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: color.borderStrong,
    borderRadius: radius.full,
  },
  checked: { borderColor: color.snuBlue, backgroundColor: color.snuBlue },
  pickName: { ...text.label, flexShrink: 0, color: color.ink },
  // Quieter than the name, and the first to give way to the state at the right (the user's phone, 2026-11-25).
  department: { ...text.caption, flex: 1, color: color.inkSubtle },
  quietName: { color: color.inkMuted },
  state: { ...text.caption, color: color.inkMuted },
  quietBusy: { backgroundColor: color.busyQuiet },
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
