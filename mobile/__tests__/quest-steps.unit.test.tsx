/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { render, screen } from '@testing-library/react-native';

import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import { color } from '@/design-system';
import { onlyRepeats, QuestSteps } from '@/screens/main/answer/quest-steps';

// The one step of the stored reply to POST /plans: "302동식당에서 식사" at 12:15.
const STEP = PLAN_QUEST.quest.subQuests[0] ?? { id: '', title: '', startsAt: null };

// Partitions of a step: with a start (the stored step), without one (changed below), and a list of two. Expected
// values: fix 5 of the design review of 2026-11-15 as ticket 05's brief sets it: rows 28 high at least and 8 apart; the
// number white in a navy circle of 22 at least; the start in tabular figures; the title alone on one line, taking the
// rest of the row. The user's phone on 2026-11-28 cut "11:30" to "11:3" in a column 44 wide and a row 28 high: nothing
// of a row is a fixed width or height any more, so a large font widens it rather than cutting it.
describe("a Quest's steps", () => {
  it('number the stored step "1" in white on a navy circle 22 across at least, in a row 28 high at least', async () => {
    await render(<QuestSteps steps={[STEP]} />);

    expect(screen.getByText('1')).toHaveStyle({ color: color.onPrimary });
    expect(screen.getByText('1').parent).toHaveStyle({ minWidth: 22, minHeight: 22, backgroundColor: color.snuBlue });
    expect(screen.getByText('1').parent).not.toHaveStyle({ width: 22 });
    expect(screen.getByText('302동식당에서 식사').parent).toHaveStyle({ flexDirection: 'row', minHeight: 28 });
    expect(screen.getByText('302동식당에서 식사').parent).not.toHaveStyle({ height: 28 });
  });

  it('put the start "12:15" whole, in tabular figures of no fixed width, and the title alone on one line after it', async () => {
    await render(<QuestSteps steps={[STEP]} />);

    expect(screen.getByText('12:15')).toHaveStyle({ fontVariant: ['tabular-nums'] });
    expect(screen.getByText('12:15')).not.toHaveStyle({ width: 44 });
    expect(screen.getByText('12:15')).toHaveProp('numberOfLines', 1);
    expect(screen.getByText('302동식당에서 식사')).toHaveStyle({ flex: 1 });
    expect(screen.getByText('302동식당에서 식사')).toHaveProp('numberOfLines', 1);
    expect(screen.queryByText('12:15 302동식당에서 식사')).toBeNull();
  });

  it('keep the start column as wide as "00:00", unseen, for a step without a start, so that the title keeps its column', async () => {
    // Changed from the stored step for the boundary: no start.
    await render(<QuestSteps steps={[{ ...STEP, startsAt: null }]} />);

    const [number, start, title] = screen.getByText('302동식당에서 식사').parent?.children ?? [];
    expect(number).toHaveTextContent('1');
    expect(start).toHaveTextContent('00:00');
    expect(start).toHaveStyle({ opacity: 0 });
    expect(title).toHaveTextContent('302동식당에서 식사');
  });

  it('stand 8 apart, one row for each step in order', async () => {
    // Changed from the stored step for the boundary: the same step twice, under a second id.
    await render(<QuestSteps steps={[STEP, { ...STEP, id: 'second' }]} />);

    expect(screen.getByTestId('quest-steps')).toHaveStyle({ gap: 8 });
    expect(screen.getAllByText('302동식당에서 식사')).toHaveLength(2);
    expect(screen.getByText('2')).toBeVisible();
  });
});

// The user's phone on 2026-11-28: "① 11:30 301동식당에서 식사" stood under "모레(월) 11:30 301동식당", saying it again.
// Partitions: one step at the line's time and place; at another place; at another time; two steps; a line with no place.
describe('Steps that only repeat the line above', () => {
  const at = STEP.startsAt ?? '';

  it("are one step at the line's time, at the place the line names", () => {
    expect(onlyRepeats([STEP], at, '302동식당')).toBe(true);
  });

  it('are not a step at another place, another time, two steps, or a line that names no place', () => {
    expect(onlyRepeats([{ ...STEP, title: '302동 앞에서 만나기' }], at, '제2공학관')).toBe(false);
    expect(onlyRepeats([{ ...STEP, startsAt: '2026-10-07T12:00:00+09:00' }], at, '302동식당')).toBe(false);
    expect(onlyRepeats([STEP, { ...STEP, id: 'second' }], at, '302동식당')).toBe(false);
    expect(onlyRepeats([STEP], at, null)).toBe(false);
  });
});
