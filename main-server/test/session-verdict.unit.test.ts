/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-05  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { JUDGEMENT_CHECKS } from '../src/global-events/judgement-answer.js';
import { verdictOf } from '../src/global-events/session-verdict.js';

function failing(...names: string[]): { name: string; passed: boolean }[] {
  return [...JUDGEMENT_CHECKS, 'timesConsistent'].map((name) => ({ name, passed: !names.includes(name) }));
}

describe('verdictOf', () => {
  it('lets a session that passes every check be published', () => {
    expect(verdictOf(failing())).toMatchObject({ publishable: true, comparable: true, draftable: true, blockedBy: [] });
  });

  it.each([
    ['announcesEvent', false, true],
    ['linesInPost', false, false],
    ['dateAgrees', false, true],
    ['weekdayAgrees', false, true],
    ['timeAgrees', false, true],
    ['notApplicationPeriod', false, true],
    ['startBeforeEnd', false, true],
    ['hasTimeOfDay', false, true],
    ['length', true, true],
    ['placeInLines', true, true],
    ['placeMatches', true, true],
    ['newSession', false, true],
    // A check added later counts towards publication only.
    ['timesConsistent', true, true],
  ])('with %s failing alone: compared %s, fills its Draft %s, never published', (name, comparable, draftable) => {
    expect(verdictOf(failing(name))).toEqual(
      expect.objectContaining({ publishable: false, comparable, draftable, blockedBy: [name] }),
    );
  });

  it('fills a Draft with neither half when both the time and the place fail', () => {
    expect(verdictOf(failing('timeAgrees', 'placeMatches'))).toMatchObject({
      comparable: false,
      draftable: false,
      timeRead: false,
      placeRead: false,
    });
  });

  it('counts a check missing from the results as failed', () => {
    const checks = failing().filter(({ name }) => name !== 'newSession');

    expect(verdictOf(checks)).toMatchObject({ publishable: false, comparable: false, blockedBy: [] });
  });
});
