/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { heldBack } from '../src/assistant/suggestions/holdback.js';
import {
  acceptanceOf,
  bucketOf,
  cooldownUntil,
  draw,
  fatigueAt,
  scoreOf,
  thresholdOf,
} from '../src/assistant/suggestions/scoring.js';

// The grey suggestions' score, exposure, fatigue and holdback (P07 ticket 04), on plain numbers.

// A time in Korea, such as '2101-03-07T12:00'.
function korea(at: string): Date {
  return new Date(`${at}:00+09:00`);
}

// Answers the numbers in turn, as the random source would.
function sequence(...numbers: number[]): () => number {
  let next = 0;
  return () => numbers[next++] ?? 0;
}

const FRESH = { shown: 0, accepted: 0 };

describe('bucketOf', () => {
  it.each([
    ['00:00', 'evening'],
    ['04:59', 'evening'],
    ['05:00', 'morning'],
    ['10:59', 'morning'],
    ['11:00', 'midday'],
    ['13:59', 'midday'],
    ['14:00', 'afternoon'],
    ['17:59', 'afternoon'],
    ['18:00', 'evening'],
  ])('%s → %s', (time, bucket) => {
    const [hours = 0, minutes = 0] = time.split(':').map(Number);
    expect(bucketOf(hours * 60 + minutes)).toBe(bucket);
  });
});

describe('acceptanceOf and scoreOf', () => {
  it('smooths acceptance with one acceptance in two impressions', () => {
    expect(acceptanceOf(FRESH)).toBe(0.5);
    expect(acceptanceOf({ shown: 8, accepted: 0 })).toBeCloseTo(0.1);
    expect(acceptanceOf({ shown: 8, accepted: 2 })).toBeCloseTo(0.3);
  });

  it('multiplies the weight, the acceptance, the repeats, capped at four, and the fatigue', () => {
    const lunch = { template: 'lunch_with_free_friend', impressions: FRESH, repeats: 0, fatigue: 1, holdback: false };
    const repeat = { ...lunch, template: 'repeat_last', repeats: 2 } as const;

    expect(scoreOf({ ...lunch, template: 'lunch_with_free_friend' })).toBe(0.5);
    expect(scoreOf({ ...lunch, template: 'route_to_next_class' })).toBeCloseTo(0.4);
    expect(scoreOf(repeat)).toBeCloseTo(1.2);
    expect(scoreOf({ ...repeat, repeats: 9 })).toBeCloseTo(1.8);
    expect(scoreOf({ ...repeat, fatigue: 0 })).toBe(0);
  });

  it('reads the base weights only for a held-back account: acceptance 0.5 and no repeats', () => {
    const impressions = { shown: 8, accepted: 0 };

    expect(scoreOf({ template: 'repeat_last', impressions, repeats: 3, fatigue: 1, holdback: true })).toBeCloseTo(0.6);
    expect(scoreOf({ template: 'repeat_last', impressions, repeats: 3, fatigue: 1, holdback: false })).toBeCloseTo(0.3);
  });

  it('asks more of the template that names a Friend', () => {
    expect(thresholdOf('lunch_with_free_friend')).toBe(0.35);
    expect(thresholdOf('route_to_next_class')).toBe(0.25);
    expect(thresholdOf('party_for_open_event')).toBe(0.25);
    expect(thresholdOf('repeat_last')).toBe(0.25);
  });
});

describe('draw', () => {
  it('shows the top with 0.9, and writes the propensity it had of all draws', () => {
    expect(draw(3, sequence(0.5))).toEqual({ index: 0, propensity: 0.9 + 0.1 / 3 });
    expect(draw(3, sequence(0.1))).toEqual({ index: 0, propensity: 0.9 + 0.1 / 3 });
    expect(draw(1, sequence(0.05, 0.5))).toEqual({ index: 0, propensity: 1 });
  });

  it('draws uniformly among all of them with 0.1, the top included', () => {
    expect(draw(3, sequence(0.05, 0.7))).toEqual({ index: 2, propensity: 0.1 / 3 });
    expect(draw(3, sequence(0.09, 0.4))).toEqual({ index: 1, propensity: 0.1 / 3 });
    expect(draw(3, sequence(0, 0.1))).toEqual({ index: 0, propensity: 0.9 + 0.1 / 3 });
  });
});

describe('cooldownUntil and fatigueAt', () => {
  it('holds suggestions back for 2 hours after the first dismissal of a day', () => {
    const dismissed = [korea('2101-03-07T12:00')];

    expect(cooldownUntil(korea('2101-03-07T13:59'), dismissed)).toEqual(korea('2101-03-07T14:00'));
    expect(fatigueAt(korea('2101-03-07T13:59'), dismissed)).toBe(0);
    expect(fatigueAt(korea('2101-03-07T14:00'), dismissed)).toBe(1);
  });

  it('for 6 hours after the second, and for the rest of the day after the third', () => {
    const twice = [korea('2101-03-07T09:00'), korea('2101-03-07T12:00')];
    const thrice = [...twice, korea('2101-03-07T19:00')];

    expect(cooldownUntil(korea('2101-03-07T17:00'), twice)).toEqual(korea('2101-03-07T18:00'));
    expect(fatigueAt(korea('2101-03-07T18:00'), twice)).toBe(1);
    expect(cooldownUntil(korea('2101-03-07T23:59'), thrice)).toEqual(korea('2101-03-08T00:00'));
    expect(fatigueAt(korea('2101-03-08T00:00'), thrice)).toBe(1);
  });

  it('counts the dismissals of each day in Korea apart, and lets a late one reach past midnight', () => {
    const lateFirst = [korea('2101-03-07T23:30')];
    const yesterdayTwice = [korea('2101-03-06T20:00'), korea('2101-03-06T22:00')];

    expect(cooldownUntil(korea('2101-03-08T01:00'), lateFirst)).toEqual(korea('2101-03-08T01:30'));
    expect(cooldownUntil(korea('2101-03-07T03:00'), yesterdayTwice)).toEqual(korea('2101-03-07T04:00'));
    expect(fatigueAt(korea('2101-03-07T10:00'), [...yesterdayTwice, korea('2101-03-07T07:00')])).toBe(1);
  });
});

describe('heldBack', () => {
  const ids = Array.from({ length: 1000 }, (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`);

  it('holds back no account at 0 and every account at 100', () => {
    expect(ids.some((id) => heldBack(id, 0))).toBe(false);
    expect(ids.every((id) => heldBack(id, 100))).toBe(true);
  });

  it('holds back about the share, each account always on the same side', () => {
    const held = ids.filter((id) => heldBack(id, 10));

    expect(held.length).toBeGreaterThan(70);
    expect(held.length).toBeLessThan(130);
    expect(held.every((id) => heldBack(id, 10))).toBe(true);
  });
});
