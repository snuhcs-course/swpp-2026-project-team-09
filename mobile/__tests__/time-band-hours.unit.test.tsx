/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { render, screen, within } from '@testing-library/react-native';

import { MEAL_PLAN_3 } from '@/api/mock/data/meal-answer-plan-3';
import { TimeBand } from '@/screens/main/answer/time-band';

// The hours under a time card's track (P01 ticket 44): a study band at 01:12 over a 24-hour room's range from now,
// 01:00 to 17:00 (P01 ticket 43), marks 04:00, 08:00 and 12:00 between its two end times; the stored meal's folded bar,
// 12:00 to 13:15, shorter than four hours, has no line of marks, so its card keeps its height. The stored meal band,
// its range set to each.

const at = (clock: string): string => `2026-11-17T${clock}:00+09:00`;
const noop = (): void => undefined;

async function drawnOver(startAt: string, endAt: string): Promise<void> {
  const band = { ...MEAL_PLAN_3.band, range: { startAt, endAt } };
  await render(
    <TimeBand band={band} disabled={false} fixed={{ from: null, until: null }} focus={null} onDrop={noop} />,
  );
}

describe('The hours under the track', () => {
  it('stand between the end times of a long range', async () => {
    await drawnOver(at('01:00'), at('17:00'));
    const hours = within(screen.getByTestId('time-band-hours'));

    for (const clock of ['04:00', '08:00', '12:00']) {
      expect(hours.getByText(clock)).toBeVisible();
    }
    expect(screen.getByTestId('time-band-start')).toHaveTextContent('01:00');
    expect(screen.getByTestId('time-band-end')).toHaveTextContent('17:00');
  });

  it('are left out, line and all, under a range shorter than four hours', async () => {
    await drawnOver(at('12:00'), at('13:15'));

    expect(screen.queryByTestId('time-band-hours')).toBeNull();
  });
});
