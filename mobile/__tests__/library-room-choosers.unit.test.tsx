/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { STUDY_GROUP_MORE_NEEDED, STUDY_GROUP_TO_SEND } from '@/api/mock/data/study-group-answers';
import type { StudyGroup } from '@/api/study-plan-types';
import { freeRooms } from '@/library/cards/rooms';
import { RoomKindChooser } from '@/screens/main/library/room-kind-chooser';
import { RoomNumberChooser } from '@/screens/main/library/room-number-chooser';
import { keepUse, keptUse, UseChooser } from '@/screens/main/library/use-chooser';
import roomList from './support/kwanjeong/getRoomList_14103_20261102.json';

// The room ticket's choosers (P10 ticket 10; design group-study-design ④ ⑤): the room kinds by floor with their free
// rooms, the free rooms of the kind, and the use of the room.

function groupOf(answer: typeof STUDY_GROUP_TO_SEND): StudyGroup {
  const group = answer.plans[0]?.study?.group;
  if (group === undefined) {
    throw new Error('no group');
  }
  return group;
}

const SLOT = { date: '2026-11-05', start: '15:00', minutes: 120 };
const cell = (name: RegExp): ReturnType<typeof screen.getByRole> => screen.getByRole('button', { name });

// Partitions: four people, whose 6인실 fit, and three, for whom none does; counts read, not yet read, and logged out.
// Expected values: the design and the server's fixtures.
describe('The room kind chooser', () => {
  it('shows each floor’s kinds with their free rooms, the chosen one outlined, the ones that do not fit grey with why', async () => {
    const counts = new Map<string, number | 'pending'>([
      ['2F-group-6', 3],
      ['4F-group-6', 11],
      ['4F-group-8', 'pending'],
    ]);
    await render(
      <RoomKindChooser counts={counts} group={groupOf(STUDY_GROUP_TO_SEND)} onChoose={jest.fn()} slot={SLOT} />,
    );

    expect(screen.getByText('15:00–17:00에 빈 방')).toBeVisible();
    expect(screen.getByText('2층')).toBeVisible();
    expect(screen.getByText('4층')).toBeVisible();
    expect(cell(/^4층 6인실 빈 방 11/u)).toBeSelected();
    expect(cell(/^4층 6인실 빈 방 11/u)).toBeEnabled();
    expect(cell(/^2층 6인실 빈 방 3/u)).not.toBeSelected();
    expect(cell(/^2층 6인실 빈 방 3/u)).toBeEnabled();
    expect(cell(/^4층 8인실 6명부터/u)).toBeDisabled();
    expect(cell(/^2층 10인실 7명부터/u)).toBeDisabled();
  });

  it('chooses a kind that fits, and none that does not', async () => {
    const onChoose = jest.fn();
    await render(
      <RoomKindChooser counts={new Map()} group={groupOf(STUDY_GROUP_TO_SEND)} onChoose={onChoose} slot={SLOT} />,
    );

    await fireEvent.press(cell(/^2층 6인실/u));
    await fireEvent.press(cell(/^4층 8인실/u));

    expect(onChoose.mock.calls).toEqual([['2F-group-6']]);
  });

  it('leaves a count not yet read empty, and every kind grey for three people', async () => {
    await render(
      <RoomKindChooser counts={null} group={groupOf(STUDY_GROUP_MORE_NEEDED)} onChoose={jest.fn()} slot={SLOT} />,
    );

    expect(screen.queryByText(/빈 방 \d/u)).toBeNull();
    expect(cell(/^4층 6인실 4명부터/u)).toBeDisabled();
  });
});

const ROOMS = freeRooms(roomList.BookingTimeList, [], { date: '2026-11-02', start: '15:00', minutes: 60 });
const FIRST = ROOMS[0]?.NAME ?? '';

// Partitions: the first room chosen by default, another pressed. Expected values: the design (three to a row) and the
// library's room list.
describe('The room number chooser', () => {
  it('shows the kind’s free rooms three to a row, with how many, the chosen one outlined', async () => {
    await render(<RoomNumberChooser chosen={FIRST} onChoose={jest.fn()} rooms={ROOMS} slot={SLOT} />);

    expect(screen.getByText(`15:00–17:00에 빈 방 ${String(ROOMS.length)}곳`)).toBeVisible();
    for (const row of screen.getAllByTestId('room-number-row')) {
      expect(within(row).getAllByRole('button').length).toBeLessThanOrEqual(3);
    }
    expect(cell(new RegExp(`^${FIRST}$`, 'u'))).toBeSelected();
  });

  it('chooses a room by its number', async () => {
    const onChoose = jest.fn();
    const [first] = ROOMS;
    await render(<RoomNumberChooser chosen={null} onChoose={onChoose} rooms={ROOMS} slot={SLOT} />);

    await fireEvent.press(cell(new RegExp(`^${first?.NAME ?? ''}$`, 'u')));

    expect(onChoose).toHaveBeenCalledWith(first?.NAME);
  });
});

// Partitions: a use chosen, and the use kept for the next time. Expected values: the design ("한 번 고른 용도는 다음에도
// 기억합니다").
describe('The use chooser', () => {
  const OPTIONS = groupOf(STUDY_GROUP_TO_SEND).useDescOptions;

  it('shows the uses as equal cells, the chosen one outlined', async () => {
    const onChoose = jest.fn();
    await render(<UseChooser chosen="과제" onChoose={onChoose} options={OPTIONS} />);

    expect(cell(/^과제$/u)).toBeSelected();
    await fireEvent.press(cell(/^연구$/u));
    expect(onChoose).toHaveBeenCalledWith('연구');
  });

  it('keeps the use chosen, and offers it the next time while the kind has it', async () => {
    await keepUse('동아리활동');

    await expect(keptUse(OPTIONS)).resolves.toBe('동아리활동');
    await expect(keptUse(['강의', '기타'])).resolves.toBeNull();
  });
});
