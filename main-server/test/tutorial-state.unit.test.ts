/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import {
  eligibleByDefault,
  type Progress,
  questStatus,
  tutorialState,
  type TutorialState,
} from '../src/tutorial/tutorial-state.js';

const KEYS = ['s-card', 'kwanjeong'];
const AT = new Date('2026-03-02T00:00:00+09:00');
const EARLIER = new Date('2026-03-01T00:00:00+09:00');

function progress(times: Partial<Progress>): Progress {
  return { enabledAt: null, stoppedAt: null, finishedAt: null, ...times };
}

const started = [{ questKey: 's-card', completedAt: null }];

describe('The tutorial state', () => {
  it.each<[string, Progress | null, { questKey: string; completedAt: Date | null }[], TutorialState]>([
    ['no row', null, [], 'off'],
    ['a row with no time set (only the row hidden)', progress({}), [], 'off'],
    ['enabled, nothing started', progress({ enabledAt: AT }), [], 'available'],
    ['enabled, a quest started', progress({ enabledAt: AT }), started, 'active'],
    ['enabled, a quest completed', progress({ enabledAt: AT }), [{ questKey: 's-card', completedAt: AT }], 'active'],
    [
      'enabled, only a quest no longer in the content',
      progress({ enabledAt: AT }),
      [{ questKey: 'gone', completedAt: null }],
      'available',
    ],
    ['stopped and enabled', progress({ enabledAt: AT, stoppedAt: AT }), started, 'stopped'],
    // Stopping before it was ever on still reads as stopped.
    ['stopped only', progress({ stoppedAt: AT }), [], 'stopped'],
    ['finished', progress({ enabledAt: AT, finishedAt: AT }), started, 'finished'],
    ['finished and stopped', progress({ enabledAt: AT, stoppedAt: AT, finishedAt: AT }), [], 'finished'],
    ['finished only', progress({ finishedAt: AT }), [], 'finished'],
    // The times are never compared: a stop before the enabling is still a stop.
    ['stopped before it was enabled', progress({ enabledAt: AT, stoppedAt: EARLIER }), [], 'stopped'],
    ['finished before it was enabled', progress({ enabledAt: AT, finishedAt: EARLIER }), [], 'finished'],
  ])('is read from %s', (_, row, quests, state) => {
    expect(tutorialState(row, quests, KEYS)).toBe(state);
  });
});

describe("A quest's status", () => {
  it.each([
    [undefined, 'notStarted'],
    [{ questKey: 's-card', completedAt: null }, 'started'],
    [{ questKey: 's-card', completedAt: AT }, 'completed'],
  ])('of %o is %s', (row, status) => {
    expect(questStatus(row)).toBe(status);
  });
});

describe('Eligibility by default', () => {
  it.each([
    [{ admissionYear: 2026, affiliation: null }, true],
    [{ admissionYear: 2027, affiliation: null }, true],
    [{ admissionYear: 2025, affiliation: null }, false],
    [{ admissionYear: null, affiliation: null }, false],
    [{ admissionYear: 2020, affiliation: 'exchange' }, true],
    [{ admissionYear: null, affiliation: 'exchange' }, true],
    [{ admissionYear: 2025, affiliation: 'undergraduate' }, false],
    [{ admissionYear: 2025, affiliation: 'graduate' }, false],
  ])('of %o in 2026 is %s', (user, eligible) => {
    expect(eligibleByDefault(user, AT)).toBe(eligible);
  });

  it('reads the year in Korea, which turns over nine hours before UTC', () => {
    const newYearInKorea = new Date('2026-12-31T15:00:00Z');

    expect(eligibleByDefault({ admissionYear: 2026, affiliation: null }, newYearInKorea)).toBe(false);
    expect(eligibleByDefault({ admissionYear: 2027, affiliation: null }, newYearInKorea)).toBe(true);
  });
});
