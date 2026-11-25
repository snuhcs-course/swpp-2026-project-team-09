/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent, render, screen } from '@testing-library/react-native';

import type { TimeBand } from '@/api/assistant-types';
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
