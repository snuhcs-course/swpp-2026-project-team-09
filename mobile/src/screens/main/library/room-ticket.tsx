/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import type { StudyGroup } from '@/api/study-plan-types';
import type { TicketView } from '@/library/cards/bookings';
import type { Slot } from '@/library/cards/payloads';
import { whenWords } from '@/library/cards/times';
import { Dashes, MainCell, SideCell, TicketFrame } from './seat-ticket';

// The room ticket (P10 ticket 10; design group-study-design ③ and 가, group-study-resume 2): the seat ticket's two cells
// for a 관정 group study room. The left cell holds the people over the kind of room, and opens the kinds; the right one
// the room, which opens the kind's free rooms. While people are missing the ticket is dimmed, the count in the danger
// colour and the kind replaced by its least ("4명부터"). Once the request is sent nothing opens; logged out of the
// library the room's label stands alone. The booked ticket is P01 ticket 15's (`bookedRoomOf`).

export interface RoomTicketOf {
  group: StudyGroup;
  // The room on the ticket ("G412"), null while it is not read.
  room: string | null;
  // The cell whose chooser is open.
  open: 'kind' | 'room' | null;
  // The request is sent: the room and the time are kept.
  locked: boolean;
  loggedIn: boolean;
  onKind: () => void;
  onRoom: () => void;
}

const kindWords = ({ floor, name }: StudyGroup['room']): string => `${String(floor)}층 ${name}`;

// The words where the kind stands: the kind, or, while people are missing, why it cannot be sent.
function kindValue(group: StudyGroup): string {
  if (group.moreNeeded === 0) {
    return kindWords(group.room);
  }
  const listed = group.rooms.find(({ spaceId }) => spaceId === group.room.spaceId);
  return listed?.reason ?? `${String(group.room.capacity.min)}명부터`;
}

export function RoomTicket({ group, room, open, locked, loggedIn, onKind, onRoom }: RoomTicketOf): ReactElement {
  const short = group.moreNeeded > 0;
  const people = `${String(group.people)}명`;
  const value = kindValue(group);
  const shown = loggedIn ? room : null;
  return (
    <TicketFrame dimmed={short} testID="room-ticket">
      <MainCell
        danger={short}
        emphasis={people}
        label="그룹스터디룸"
        onPress={locked || short ? null : onKind}
        open={open === 'kind'}
        said={{ label: `그룹스터디룸: ${value}`, value: people }}
        testID="room-ticket-kind"
        value={value}
      />
      <Dashes />
      <SideCell
        label="방"
        onPress={locked || short || shown === null ? null : onRoom}
        open={open === 'room'}
        testID="room-ticket-room"
        value={shown}
      />
    </TicketFrame>
  );
}

// The booked room as P01 ticket 15's booked ticket draws it: ✓ 예약됨 with the day and time, the kind at 관정, and the
// room, or the room's label alone when it cannot be read; never a guess.
export function bookedRoomOf(group: StudyGroup, slot: Slot, room: string | null, now: Date): TicketView {
  return {
    state: 'booked',
    word: '예약됨',
    when: whenWords(slot.date, slot.start, slot.minutes, now),
    room: `관정 ${kindWords(group.room)}`,
    unit: '방',
    seat: room ?? '',
  };
}
