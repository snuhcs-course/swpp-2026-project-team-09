/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { StudyGroup } from '@/api/study-plan-types';
import { color, font, text } from '@/design-system';
import type { Slot } from '@/library/cards/payloads';
import type { LibraryRoomTimes } from '@/library/replies';
import { TicketLine } from '../library/booked-ticket';
import { RoomKindChooser } from '../library/room-kind-chooser';
import { useRoomKindCounts } from '../library/room-kind-counts';
import { RoomNumberChooser } from '../library/room-number-chooser';
import { UseChooser } from '../library/use-chooser';
import { useRooms } from '../library/use-room-counts';

// The parts under the study answer together's room ticket (P10 tickets 11 and 12): the use line, the choosers, and the
// request's line.

export type Open = 'kind' | 'room' | 'use' | null;

export function UseLine({ use, onPress }: { use: string | null; onPress: () => void }): ReactElement {
  return (
    <Pressable
      accessibilityLabel={`사용 용도: ${use ?? '고르기'}`}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.useLine}
      testID="room-use-line"
    >
      <Text style={styles.hint}>사용 용도</Text>
      <Text style={styles.link}>{`${use ?? '고르기'} ›`}</Text>
    </Pressable>
  );
}

export function Choosers(props: {
  open: Open;
  group: StudyGroup;
  slot: Slot;
  rooms: LibraryRoomTimes[] | null;
  room: string | null;
  use: string | null;
  onKind: (spaceId: string) => void;
  onRoom: (name: string) => void;
  onUse: (use: string) => void;
}): ReactElement | null {
  const { open, group, slot, rooms, room, use } = props;
  const counting = useRoomKindCounts(
    group.rooms.filter(({ fits }) => fits).map((kind) => kind.space),
    slot,
  );
  const counted = useRooms(counting);
  useEffect(() => {
    if (open === 'kind') {
      void counting.read();
    }
  }, [open, counting]);
  if (open === 'kind') {
    const counts = counted.state === 'listed' ? counted.counts : null;
    return <RoomKindChooser counts={counts} group={group} onChoose={props.onKind} slot={slot} />;
  }
  if (open === 'room') {
    return <RoomNumberChooser chosen={room} onChoose={props.onRoom} rooms={rooms ?? []} slot={slot} />;
  }
  return open === 'use' ? <UseChooser chosen={use} onChoose={props.onUse} options={group.useDescOptions} /> : null;
}

// The request's line: the consents, and "요청 취소 ›" at its end, as a booked ticket's "예약 취소 ›".
export function RequestLine({ words, onCancel }: { words: string; onCancel: (() => void) | null }): ReactElement {
  return (
    <View testID="study-group-line">
      <TicketLine link={onCancel === null ? null : { words: '요청 취소', onPress: onCancel }} words={words} />
    </View>
  );
}

const styles = StyleSheet.create({
  useLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hint: { ...text.caption, color: color.inkMuted },
  link: { ...text.caption, fontFamily: font.semiBold, color: color.snuBlue },
});
