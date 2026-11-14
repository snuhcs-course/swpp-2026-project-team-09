/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { render, screen } from '@testing-library/react-native';

import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import { color } from '@/design-system';
import { QuestSteps } from '@/screens/main/answer/quest-steps';

// The one step of the stored reply to POST /plans: "302동식당에서 식사" at 12:15.
const STEP = PLAN_QUEST.quest.subQuests[0] ?? { id: '', title: '', startsAt: null };

// Partitions of a step: with a start (the stored step), without one (changed below), and a list of two. Expected
// values: fix 5 of the design review of 2026-11-15 as ticket 05's brief sets it: rows 28 high and 8 apart; the number
// white in a navy circle of 22; the start in a column 44 wide in tabular figures, empty without a start; the title
// alone on one line, taking the rest of the row.
describe("a Quest's steps", () => {
  it('number the stored step "1" in white on a navy circle 22 across, in a row 28 high', async () => {
    await render(<QuestSteps steps={[STEP]} />);

    expect(screen.getByText('1')).toHaveStyle({ color: color.onPrimary });
    expect(screen.getByText('1').parent).toHaveStyle({ width: 22, height: 22, backgroundColor: color.snuBlue });
    expect(screen.getByText('302동식당에서 식사').parent).toHaveStyle({ flexDirection: 'row', height: 28 });
  });

  it('put the start "12:15" in a column 44 wide and the title alone on one line after it', async () => {
    await render(<QuestSteps steps={[STEP]} />);

    expect(screen.getByText('12:15')).toHaveStyle({ width: 44, fontVariant: ['tabular-nums'] });
    expect(screen.getByText('302동식당에서 식사')).toHaveStyle({ flex: 1 });
    expect(screen.getByText('302동식당에서 식사')).toHaveProp('numberOfLines', 1);
    expect(screen.queryByText('12:15 302동식당에서 식사')).toBeNull();
  });

  it('leave the start column empty for a step without a start, so that the title keeps its column', async () => {
    // Changed from the stored step for the boundary: no start.
    await render(<QuestSteps steps={[{ ...STEP, startsAt: null }]} />);

    const [number, start, title] = screen.getByText('302동식당에서 식사').parent?.children ?? [];
    expect(number).toHaveTextContent('1');
    expect(start).toHaveStyle({ width: 44 });
    expect(start).toHaveTextContent('');
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
