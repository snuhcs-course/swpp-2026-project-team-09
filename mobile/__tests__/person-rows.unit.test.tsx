/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent, render, screen, within } from '@testing-library/react-native';

import type { TimeBand } from '@/api/assistant-types';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { withOtherFriends } from '@/api/mock/other-friends';
import { color } from '@/design-system';
import { pickRowsOf } from '@/features/assistant/people-picking';
import { MEAL_PLAN_3 } from '@/api/mock/data/meal-answer-plan-3';
import { PersonRows } from '@/screens/main/answer/person-rows';

// The open time card's rows (P04 ticket 61): up to four people they show whole; with more, their room is four and a
// half rows and they scroll in it. The lanes are made up from the third Plan's band of the stored reply to "배고파,
// 민수랑 같이", 나 and as many Friends as a case needs. Expected values: rows laid out 36 high, 8 apart, under 8 of room
// at the top, so that four people are 8 + 4 × 36 + 3 × 8 = 176 high, and four and a half rows 8 + 4 × (36 + 8) + 18 =
// 202, whatever the number past four.
const { band } = MEAL_PLAN_3;
const ROW = 36;
const GAP = 8;
const TOP = 8;

function bandOf(people: number): TimeBand {
  const [me, friend] = band.lanes;
  if (me === undefined || friend === undefined) {
    throw new Error('The band has no two lanes');
  }
  const friends = Array.from({ length: people - 1 }, (_, at) => ({
    ...friend,
    userId: `made-up-${String(at + 1)}`,
    name: `친구 ${String(at + 1)}`,
  }));
  return { ...band, lanes: [me, ...friends] };
}

async function laidOut(people: number): Promise<jest.Mock<void, [number]>> {
  const onHeight = jest.fn<void, [number]>();
  await render(
    <PersonRows
      band={bandOf(people)}
      fixed={{ from: null, until: null }}
      hidden={false}
      moving={null}
      onHeight={onHeight}
      shown={{ startAt: band.startAt, endAt: band.endAt }}
    />,
  );
  const whole = TOP + people * ROW + (people - 1) * GAP;
  await fireEvent(screen.getByTestId('time-card-rows'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 320, height: whole } },
  });
  return onHeight;
}

// Partitions: four people, the most shown whole; five, the first past it; seven, more.
describe('the open time card’s rows', () => {
  it('show four people whole, at their own height, without scrolling', async () => {
    const onHeight = await laidOut(4);

    expect(onHeight).toHaveBeenLastCalledWith(176);
    expect(screen.getByTestId('time-card-rows-room')).toHaveProp('scrollEnabled', false);
    expect(screen.getByTestId('time-card-rows-room')).toHaveStyle({ height: 176 });
  });

  it.each([5, 7])('show %i people in four and a half rows, and scroll to the rest', async (people) => {
    const onHeight = await laidOut(people);

    expect(onHeight).toHaveBeenLastCalledWith(202);
    expect(screen.getByTestId('time-card-rows-room')).toHaveProp('scrollEnabled', true);
    expect(screen.getByTestId('time-card-rows-room')).toHaveStyle({ height: 202 });
    expect(screen.getAllByText(/^친구 \d$/u)).toHaveLength(people - 1);
  });
});

// Partitions: picking over the mock's other Friends, whose lanes have busy stretches, one checked. Expected values: a row
// for each Friend, none for 나, and no bar at all: the combined bar on top changes with each check instead (the user,
// 2026-11-25).
describe('the rows while picking', () => {
  const picked = withOtherFriends(MEAL_ANSWER).plans[0]?.band;
  if (picked === undefined) {
    throw new Error('The mock answer has no Plan');
  }

  it('are the Friends alone, each with a check and no bar', async () => {
    const rows = pickRowsOf({ band: picked, picked: ['f1'], walks: new Map(), friends: [] });
    await render(
      <PersonRows
        band={picked}
        fixed={{ from: null, until: null }}
        hidden={false}
        moving={null}
        onHeight={jest.fn<void, [number]>()}
        picking={{ rows, onPick: jest.fn<void, [string]>() }}
        shown={{ startAt: picked.startAt, endAt: picked.endAt }}
      />,
    );

    expect(screen.getAllByRole('checkbox')).toHaveLength(picked.lanes.length - 1 + (picked.others ?? []).length);
    expect(screen.getByTestId('time-card-pick-f1')).toBeChecked();
    expect(screen.queryByTestId('time-card-busy')).toBeNull();
    expect(screen.queryByText('나')).toBeNull();
  });
});

function pickLineOf(userId: string): ReturnType<typeof within> {
  return within(screen.getByTestId(`time-card-pick-${userId}`));
}

// Partitions: a busy Friend unchecked, and one checked, over the mock's other Friends.
describe('a busy Friend’s row while picking', () => {
  const busyBand = withOtherFriends(MEAL_ANSWER).plans[0]?.band;
  if (busyBand === undefined) {
    throw new Error('The mock answer has no Plan');
  }

  // The user's review of the first pictures (2026-11-25): an unchecked Friend busy over the span did not show it before
  // a check. In variant R3 the row says why and reads quieter until it is checked.
  it('show a busy Friend’s reason, quieter until checked, and the name in ink once checked', async () => {
    const all = pickRowsOf({ band: busyBand, picked: [], walks: new Map(), friends: [] });
    const [unchecked, checked] = all.filter(({ busyAtSpan }) => busyAtSpan !== null);
    if (unchecked === undefined || checked === undefined) {
      throw new Error('The mock has fewer than two busy Friends');
    }
    const rows = pickRowsOf({ band: busyBand, picked: [checked.userId], walks: new Map(), friends: [] });
    await render(
      <PersonRows
        band={busyBand}
        fixed={{ from: null, until: null }}
        hidden={false}
        moving={null}
        onHeight={jest.fn<void, [number]>()}
        picking={{ rows, onPick: jest.fn<void, [string]>() }}
        shown={{ startAt: busyBand.startAt, endAt: busyBand.endAt }}
      />,
    );

    expect(pickLineOf(unchecked.userId).getByText(unchecked.reason ?? '')).toHaveStyle({ color: color.inkMuted });
    expect(pickLineOf(unchecked.userId).getByText(unchecked.name)).toHaveStyle({ color: color.inkSubtle });
    expect(pickLineOf(checked.userId).getByText(checked.name)).toHaveStyle({ color: color.ink });
  });
});

// Partitions: five Friends, the most shown whole while picking; seven, more. Expected values: rows 36 high with no gap
// under 8 of room (variant R3), so five are 8 + 5 × 36 = 188 and five and a half 8 + 5.5 × 36 = 206.
describe('the room of the rows while picking', () => {
  const mockBand = withOtherFriends(MEAL_ANSWER).plans[0]?.band;
  if (mockBand === undefined) {
    throw new Error('The mock answer has no Plan');
  }

  it.each([
    [5, 188, false],
    [7, 206, true],
  ])('is %i rows of 36 at %i, scrolling: %s', async (people, room, scrolls) => {
    const rows = pickRowsOf({ band: mockBand, picked: [], walks: new Map(), friends: [] }).slice(0, people);
    const onHeight = jest.fn<void, [number]>();
    await render(
      <PersonRows
        band={mockBand}
        fixed={{ from: null, until: null }}
        hidden={false}
        moving={null}
        onHeight={onHeight}
        picking={{ rows, onPick: jest.fn<void, [string]>() }}
        shown={{ startAt: mockBand.startAt, endAt: mockBand.endAt }}
      />,
    );
    await fireEvent(screen.getByTestId('time-card-rows'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 320, height: TOP + people * 36 } },
    });

    expect(onHeight).toHaveBeenLastCalledWith(room);
    expect(screen.getByTestId('time-card-rows-room')).toHaveProp('scrollEnabled', scrolls);
  });
});
