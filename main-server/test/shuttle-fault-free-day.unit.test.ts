/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { deriveTiming } from '../scripts/shuttle/timing.ts';
import { shuttleTimingSchema } from '../src/shuttle/shuttle-timing.ts';
import { cleaned } from './shuttle-fixtures.ts';

// Two cars half a lap apart: each spends 90 s at a stop and drives two laps, so that a car leaves every stop each 630 s.
describe('a fault-free day', () => {
  const { day, report } = cleaned('fault-free');

  it('drops nothing', () => {
    expect(report).toEqual([]);
    expect(day.windows).toEqual([]);
    expect(day.headways.filter(({ droppedFor }) => droppedFor !== null)).toEqual([]);
  });

  it('gives each stop half its headway as the average wait', () => {
    const { waits } = deriveTiming([day]);
    expect(Object.keys(waits)).toHaveLength(14);
    expect(waits['0']).toEqual({ '08-11': 315 });
    expect(waits['13']).toEqual({ '08-11': 315 });
  });

  it('gives every pair of stops its ride, 1 to 13 stops ahead', () => {
    const { rides } = deriveTiming([day]);
    expect(rides['1']?.['2']).toEqual({ '08-11': 90 });
    expect(rides['13']?.['0']).toEqual({ '08-11': 90 });
    expect(rides['3']?.['2']).toEqual({ '08-11': 1170 });
    expect(rides['3']?.['3']).toBeUndefined();
  });

  it('writes the shape that travel reads', () => {
    const timing = deriveTiming([day]);
    expect(timing.days).toEqual(['2026-11-02']);
    expect(shuttleTimingSchema.parse(timing)).toEqual(timing);
  });
});
