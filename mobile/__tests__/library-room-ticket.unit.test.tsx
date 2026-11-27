/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { STUDY_GROUP_MORE_NEEDED, STUDY_GROUP_TO_SEND, type StudyAnswer } from '@/api/mock/data/study-group-answers';
import type { StudyGroup } from '@/api/study-plan-types';
import { color } from '@/design-system';
import { BookedTicket } from '@/screens/main/library/booked-ticket';
import { bookedRoomOf, RoomTicket } from '@/screens/main/library/room-ticket';

// The room ticket (P10 ticket 10; design group-study-design ③ and 가, group-study-resume 2 and 2-2): the seat ticket's
// two cells for a group study room, the kind and the people at the left and the room at the right.

function groupOf(answer: StudyAnswer): StudyGroup {
  const group = answer.plans[0]?.study?.group;
  if (group === undefined) {
    throw new Error('no group');
  }
  return group;
}

const TO_SEND = groupOf(STUDY_GROUP_TO_SEND);
const SHORT = groupOf(STUDY_GROUP_MORE_NEEDED);

function ticket(overrides: Partial<Parameters<typeof RoomTicket>[0]> = {}): Parameters<typeof RoomTicket>[0] {
  return {
    group: TO_SEND,
    room: 'G412',
    open: null,
    locked: false,
    loggedIn: true,
    onKind: jest.fn<void, []>(),
    onRoom: jest.fn<void, []>(),
    ...overrides,
  };
}

const kindCell = (): ReturnType<typeof screen.getByTestId> => screen.getByTestId('room-ticket-kind');
const roomCell = (): ReturnType<typeof screen.getByTestId> => screen.getByTestId('room-ticket-room');

// Partitions: to send, and a chooser open. Expected values: the design.
describe('The room ticket to send', () => {
  it('shows the people and the kind at the left and the room at the right, each opening its chooser', async () => {
    const props = ticket();
    await render(<RoomTicket {...props} />);

    expect(within(kindCell()).getByText('그룹스터디룸 · 4명')).toBeVisible();
    expect(within(kindCell()).getByText('4층 6인실')).toBeVisible();
    expect(within(roomCell()).getByText('방')).toBeVisible();
    expect(within(roomCell()).getByText('G412')).toBeVisible();
    expect(screen.getByTestId('room-ticket-kind-chevron')).toBeOnTheScreen();
    expect(screen.getByTestId('room-ticket-room-chevron')).toBeOnTheScreen();

    await fireEvent.press(kindCell());
    await fireEvent.press(roomCell());
    expect(props.onKind).toHaveBeenCalledTimes(1);
    expect(props.onRoom).toHaveBeenCalledTimes(1);
  });

  it('lights the cell whose chooser is open', async () => {
    await render(<RoomTicket {...ticket({ open: 'kind' })} />);

    expect(kindCell()).toHaveStyle({ backgroundColor: color.svcStudySoft });
    expect(kindCell()).toBeExpanded();
    expect(roomCell()).not.toBeExpanded();
  });
});

// Partitions: sent, short of people, and logged out of the library. Expected values: the design.
describe('The room ticket that cannot be acted on', () => {
  it('has no chevron and opens nothing once the request is sent', async () => {
    const props = ticket({ locked: true });
    await render(<RoomTicket {...props} />);

    expect(screen.queryByTestId('room-ticket-kind-chevron')).toBeNull();
    expect(screen.queryByTestId('room-ticket-room-chevron')).toBeNull();
    await fireEvent.press(kindCell());
    await fireEvent.press(roomCell());
    expect(props.onKind).not.toHaveBeenCalled();
    expect(props.onRoom).not.toHaveBeenCalled();
  });

  it('is dimmed while people are missing, the count in the danger colour and the kind its least', async () => {
    const props = ticket({ group: SHORT });
    await render(<RoomTicket {...props} />);

    expect(screen.getByTestId('room-ticket')).toHaveStyle({ opacity: 0.45 });
    expect(within(kindCell()).getByText('3명')).toHaveStyle({ color: color.danger });
    expect(within(kindCell()).getByText('4명부터')).toBeVisible();
    await fireEvent.press(kindCell());
    expect(props.onKind).not.toHaveBeenCalled();
  });

  it('keeps the room’s label alone, with nothing to press, logged out of the library', async () => {
    const props = ticket({ loggedIn: false, room: null });
    await render(<RoomTicket {...props} />);

    expect(within(roomCell()).getByText('방')).toBeVisible();
    expect(within(roomCell()).queryByText(/G\d+/u)).toBeNull();
    expect(screen.queryByTestId('room-ticket-room-chevron')).toBeNull();
    await fireEvent.press(roomCell());
    expect(props.onRoom).not.toHaveBeenCalled();
  });
});

const NOW = new Date('2026-11-04T19:10:00+09:00');
const SLOT = { date: '2026-11-05', start: '15:00', minutes: 120 };

// Partitions: the room booked known, and not known. Expected values: the design's booked look 나 and P01 ticket 15's
// ticket, never a guessed room.
describe('The booked room ticket', () => {
  it('is P01 ticket 15’s booked ticket: ✓ 예약됨 with the day and time, the kind, and the room', async () => {
    await render(<BookedTicket ticket={bookedRoomOf(TO_SEND, SLOT, 'G412', NOW)} />);

    expect(screen.getByText(/예약됨/u)).toBeVisible();
    expect(screen.getByText(/ · 내일 15:00–17:00/u)).toBeVisible();
    expect(screen.getByText('관정 4층 6인실')).toBeVisible();
    expect(screen.getByText('방')).toBeVisible();
    expect(screen.getByText('G412')).toBeVisible();
  });

  it('keeps the room’s label alone when the room cannot be read', async () => {
    await render(<BookedTicket ticket={bookedRoomOf(TO_SEND, SLOT, null, NOW)} />);

    expect(screen.getByText('방')).toBeVisible();
    expect(screen.queryByText(/G\d+/u)).toBeNull();
  });
});
