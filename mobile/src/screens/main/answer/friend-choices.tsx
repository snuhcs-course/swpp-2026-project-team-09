/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import type { LatLng } from '@/api/types';
import { ChoiceGrid, choiceRowsWithin, color, type GridChoice, text } from '@/design-system';
import { metresBetween } from '@/features/assistant/answer-drawing';
import { givenName } from '@/features/map/short-name';

interface FriendChoice {
  id: string;
  name: string;
  // Null when the Friend's position is not known.
  position: LatLng | null;
  // How many minutes ago an old position was measured; null for a recent one and for none.
  minutesOld: number | null;
}

interface FriendChoicesProps {
  // The Friends who are not in the Plan.
  friends: readonly FriendChoice[];
  // The picked Restaurant of the Plan on screen, which the distances are measured to; null without a Plan.
  pick: LatLng | null;
  disabled: boolean;
  // The Friend whose add is on its way, chosen here or on the map: their cell says so.
  pending: string | null;
  onChoose: (userId: string) => void;
  // How high the card's Plan may stand before the card scrolls, null until it is known.
  room: number | null;
}

const KILOMETRE = 1000;
const MOST_ROWS = 4;
const LEAST_ROWS = 2;

// The whole rows that fit between the list's top and the end of the card's room: at most four, and at least two.
function rowsIn(room: number | null, top: number | null): number {
  if (room === null || top === null) {
    return MOST_ROWS;
  }
  return Math.min(MOST_ROWS, Math.max(LEAST_ROWS, choiceRowsWithin(room - top)));
}

// "350m" to ten metres under a kilometre, "1.2km" to a tenth from one.
function distanceWords(metres: number): string {
  const tens = Math.round(metres / 10) * 10;
  return tens < KILOMETRE ? `${tens}m` : `${(metres / KILOMETRE).toFixed(1)}km`;
}

interface Measured {
  friend: FriendChoice;
  given: string;
  // Null without a position or without a pick.
  metres: number | null;
}

// Nearest first, those without a position last, and by name where that leaves a tie.
function byNearness(one: Measured, other: Measured): number {
  const far = ({ friend, metres }: Measured): number =>
    friend.position === null ? Number.POSITIVE_INFINITY : (metres ?? 0);
  return far(one) - far(other) || one.given.localeCompare(other.given, 'ko');
}

// The one fact at a cell's right: how far, how old the position is when it is old, or that it is not known.
function valueOf({ friend: { position, minutesOld }, metres }: Measured): string {
  if (position === null) {
    return '자리 모름';
  }
  if (minutesOld !== null) {
    return `${minutesOld}분 전`;
  }
  return metres === null ? '' : distanceWords(metres);
}

function cellOf(measured: Measured, pending: string | null): GridChoice {
  const { friend, given } = measured;
  if (friend.id === pending) {
    return { key: friend.id, name: given, value: '넣는 중', faint: false, label: `${given}, 넣는 중`, busy: true };
  }
  const value = valueOf(measured);
  const label = [given, value, '추가'].filter((part) => part !== '').join(', ');
  return { key: friend.id, name: given, value, faint: friend.position === null, label };
}

// The card's list of Friends to add to the Plan, opened by "＋ 같이": each by the name their face and chip show, and
// how far they are from the picked Restaurant, nearest first, in as many whole rows as the card has room for.
export function FriendChoices({ friends, pick, disabled, pending, onChoose, room }: FriendChoicesProps): ReactElement {
  const [top, setTop] = useState<number | null>(null);
  const cells = friends
    .map((friend) => ({
      friend,
      given: givenName(friend.name),
      metres: friend.position === null || pick === null ? null : metresBetween(pick, friend.position),
    }))
    .toSorted(byNearness)
    .map((measured) => cellOf(measured, pending));
  return (
    <View
      onLayout={({ nativeEvent }: LayoutChangeEvent) => {
        setTop(nativeEvent.layout.y);
      }}
      testID="friend-choices"
    >
      {cells.length === 0 ? (
        <Text style={styles.none}>더 넣을 친구가 없어요</Text>
      ) : (
        <ChoiceGrid choices={cells} disabled={disabled} onChoose={onChoose} rows={rowsIn(room, top)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  none: { ...text.body, color: color.inkMuted },
});
