/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { type Candidate, fitOf, type Gap } from '../src/assistant/free-time/candidate-fit.js';
import { type TravelProvider } from '../src/travel/travel.js';

// The side after a gap, on one way of 5 minutes on foot. The next item starts at 14:00, so the User leaves by 13:54.
const travel: TravelProvider = {
  travel: () => ({ seconds: 300, mode: 'walk' }),
  walkingSeconds: () => 300,
};

const at = (time: string): Date => new Date(`2098-01-05T${time}:00+09:00`);

const gap = (after: Gap['after']): Gap => ({ leavesAt: at('12:15'), origin: 'here', after, endsBy: null });

const nextItem = gap({ kind: 'item', at: at('14:00'), placeId: 'there', isClass: true });

const candidate = (start: string, end: string | null): Candidate => ({
  start: at(start),
  end: end === null ? null : at(end),
  placeId: 'near',
});

const fit = (start: string, end: string | null, around = nextItem): object | null =>
  fitOf(candidate(start, end), around, travel, at('11:30'));

describe('A candidate with an end of at most 3 hours', () => {
  it('shows the way to the next item when it ends in time', () => {
    expect(fit('13:00', '13:40')).toMatchObject({ next: { minutes: 5, isClass: true } });
  });

  it('shows when to leave when it ends too late, the User staying at least 30 minutes', () => {
    const box = fit('13:00', '13:56');

    expect(box).toMatchObject({ leaveBy: '13:54' });
    expect(box).not.toHaveProperty('next');
    expect(box).not.toHaveProperty('endUnknown');
  });

  it('stays out when it ends too late and leaves under 30 minutes', () => {
    expect(fit('13:30', '13:56')).toBeNull();
  });
});

describe('A candidate after a leave-by time the User gave', () => {
  const leaving = gap({ kind: 'leaveBy', at: at('13:30') });

  it('shows nothing more when it ends by then', () => {
    expect(fit('12:40', '13:30', leaving)).toEqual(expect.not.objectContaining({ leaveBy: expect.anything() }));
  });

  it('shows that time when it ends later, the User staying at least 30 minutes', () => {
    expect(fit('12:40', '13:40', leaving)).toMatchObject({ leaveBy: '13:30' });
    expect(fit('13:10', '13:40', leaving)).toBeNull();
  });
});
