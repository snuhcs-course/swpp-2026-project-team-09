/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { render, screen, userEvent } from '@testing-library/react-native';
import type { ComponentProps } from 'react';

import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { FRIENDS, POSITIONS } from '@/api/mock/data/friends';
import type { LatLng } from '@/api/types';
import { FriendChoices } from '@/screens/main/answer/friend-choices';

type Props = ComponentProps<typeof FriendChoices>;
type Choice = Props['friends'][number];

const METRES_PER_DEGREE = 111_320;
// The picked Restaurant of the first Plan of the stored answer to "배고파, 민수랑 같이": 302동식당.
const PICK: LatLng = MEAL_ANSWER.plans[0]?.place ?? { latitude: 0, longitude: 0 };

// A Friend of the mock with the position the mock gives, recent.
function mockFriend(id: string): Choice {
  const friend = FRIENDS.find((one) => one.id === id);
  if (friend === undefined) {
    throw new Error(`The mock has no Friend ${id}`);
  }
  const at = POSITIONS.find(({ userId }) => userId === id);
  const position = at === undefined ? null : { latitude: at.latitude, longitude: at.longitude };
  return { id, name: friend.name, position, minutesOld: null };
}

// 강도윤, 김민준, 서지우 (no position), 임채원, and 정하은, in the mock's order. By the spec's flat map (a degree of
// latitude 111,320 metres, one of longitude that times the cosine of the latitude) they stand 719.9, 1186.6, -,
// 1074.2, and 157.1 metres from 302동식당.
const FRIENDS_SHOWN = ['f6', 'f1', 'f11', 'f10', 'f5'].map(mockFriend);

const noop = (): void => undefined;

async function show(props: Partial<Props> = {}): Promise<void> {
  await render(
    <FriendChoices disabled={false} friends={FRIENDS_SHOWN} onChoose={noop} onClose={noop} pick={PICK} {...props} />,
  );
}

function cells(): unknown[] {
  return screen.getAllByRole('button', { name: /추가$/u }).map(({ props }): unknown => props.accessibilityLabel);
}

describe('FriendChoices in order', () => {
  // Partitions: Friends at a distance under a kilometre and from one, one without a position, and no Plan to measure
  // from. The rule: the decision of 2026-11-15, the given name, the distance to the picked Restaurant ("350m" to 10
  // metres under a kilometre, "1.2km" from one), "자리 모름" without a position; nearest first, those without last.
  it('lists the Friends nearest first by their given names and distances, those without a position last', async () => {
    await show();

    expect(cells()).toEqual([
      '하은, 160m, 추가',
      '도윤, 720m, 추가',
      '채원, 1.1km, 추가',
      '민준, 1.2km, 추가',
      '지우, 자리 모름, 추가',
    ]);
    expect(screen.getByRole('button', { name: '하은, 160m, 추가' })).toHaveTextContent('하은160m');
  });

  it('orders two Friends at one distance by name', async () => {
    // 이서연 is moved to 강도윤's position, and listed before him.
    const seoyeon = { ...mockFriend('f2'), position: mockFriend('f6').position };

    await show({ friends: [seoyeon, mockFriend('f6')] });

    expect(cells()).toEqual(['도윤, 720m, 추가', '서연, 720m, 추가']);
  });

  it('orders by name, without distances, for an answer without a Plan', async () => {
    await show({ pick: null });

    expect(cells()).toEqual(['도윤, 추가', '민준, 추가', '채원, 추가', '하은, 추가', '지우, 자리 모름, 추가']);
  });
});

// A Friend named `name` that far north of 302동식당.
function northOfPick(name: string, metres: number): Choice {
  return {
    id: name,
    name,
    position: { latitude: PICK.latitude + metres / METRES_PER_DEGREE, longitude: PICK.longitude },
    minutesOld: null,
  };
}

describe('FriendChoices distances and ages', () => {
  // Partitions: the edge of a kilometre after rounding to 10 metres, just under and just over; a position 2 minutes
  // old or more, which says its age in place of the distance.
  it.each([
    [994, '990m'],
    [996, '1.0km'],
  ])('says %d metres as %s', async (metres, words) => {
    await show({ friends: [northOfPick('김하늘', metres)] });

    expect(cells()).toEqual([`하늘, ${words}, 추가`]);
  });

  it("says an old position's age in place of its distance, and keeps it in the order of distances", async () => {
    // 김민준's position is made 3 minutes old.
    const friends = FRIENDS_SHOWN.map((friend) => (friend.id === 'f1' ? { ...friend, minutesOld: 3 } : friend));

    await show({ friends });

    expect(cells()[3]).toBe('민준, 3분 전, 추가');
  });
});

describe('FriendChoices shown', () => {
  // Partitions: Friends to add, and none to add.
  it('asks who to eat with', async () => {
    await show();

    expect(screen.getByText('누구와 같이 먹을까요?')).toBeVisible();
  });

  it('says there is nobody more to add above 닫기', async () => {
    await show({ friends: [] });

    expect(screen.getByText('더 넣을 친구가 없어요')).toBeVisible();
    expect(screen.getByRole('button', { name: '닫기' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /추가$/u })).toBeNull();
  });
});

describe('FriendChoices pressed', () => {
  // Partitions: a press on a Friend, on 닫기, and on a Friend while disabled.
  it('chooses the Friend pressed', async () => {
    const onChoose = jest.fn<void, [string]>();
    await show({ onChoose });

    await userEvent.press(screen.getByRole('button', { name: '지우, 자리 모름, 추가' }));

    expect(onChoose).toHaveBeenCalledWith('f11');
  });

  it('closes with 닫기', async () => {
    const onClose = jest.fn<void, []>();
    await show({ onClose });

    await userEvent.press(screen.getByRole('button', { name: '닫기' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('takes no choice while a recalculation is on its way', async () => {
    const onChoose = jest.fn<void, [string]>();
    await show({ disabled: true, onChoose });

    await userEvent.press(screen.getByRole('button', { name: '하은, 160m, 추가' }));

    expect(onChoose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '하은, 160m, 추가' })).toBeDisabled();
  });
});
