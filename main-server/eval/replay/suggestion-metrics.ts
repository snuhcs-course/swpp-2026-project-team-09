/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Rate, rate } from './wilson.ts';

// The acceptance curves of the grey suggestions (research note 06 §5) from suggestion_impressions: per week in Korea
// and template, held-back accounts apart, and each template's acceptance weighted by inverse propensity.

export interface Impression {
  template: string;
  propensity: number;
  holdback: boolean;
  shownAt: Date;
  outcome: 'shown' | 'accepted' | 'dismissed' | 'confirmed';
  outcomeAt: Date | null;
}

// An outcome within this long of the suggestion counts as its answer; a suggestion still shown after it was ignored.
export const SETTLED_MS = 10 * 60 * 1000;

const KOREA_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// The ISO week of a time in Korea: 2026-W44, from Monday to Sunday.
export function koreaWeek(at: Date): string {
  const clock = new Date(at.getTime() + KOREA_OFFSET_MS);
  const weekday = (clock.getUTCDay() + 6) % 7;
  // The week's Thursday decides its year.
  const thursday = Date.UTC(clock.getUTCFullYear(), clock.getUTCMonth(), clock.getUTCDate() - weekday + 3);
  const year = new Date(thursday).getUTCFullYear();
  const week = 1 + Math.floor((thursday - Date.UTC(year, 0, 1)) / (7 * DAY_MS));
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export interface SuggestionCell {
  week: string;
  template: string;
  holdback: boolean;
  shown: number;
  // Tapped, whether or not its Quest was made.
  acceptance: Rate;
  confirmedWithin10Minutes: Rate;
  dismissal: Rate;
  ignored: Rate;
}

export interface WeightedAcceptance {
  template: string;
  holdback: boolean;
  shown: number;
  // Σ accepted / propensity over Σ 1 / propensity; null with no impression.
  acceptance: number | null;
}

function within(impression: Impression): boolean {
  return impression.outcomeAt !== null && impression.outcomeAt.getTime() - impression.shownAt.getTime() <= SETTLED_MS;
}

function isAccepted({ outcome }: Impression): boolean {
  return outcome === 'accepted' || outcome === 'confirmed';
}

interface Group {
  week: string;
  template: string;
  holdback: boolean;
  impressions: Impression[];
}

// The impressions by template and arm, and by week too when `byWeek`, in the order of their keys.
function groupsOf(impressions: readonly Impression[], byWeek: boolean): Group[] {
  const groups = new Map<string, Group>();
  for (const impression of impressions) {
    const { template, holdback, shownAt } = impression;
    const week = byWeek ? koreaWeek(shownAt) : '';
    const at = `${week} ${template} ${holdback ? 'holdback' : 'learned'}`;
    const group = groups.get(at) ?? { week, template, holdback, impressions: [] };
    group.impressions.push(impression);
    groups.set(at, group);
  }
  return [...groups].toSorted(([a], [b]) => a.localeCompare(b)).map(([, group]) => group);
}

function cellOf({ week, template, holdback, impressions }: Group): SuggestionCell {
  const n = impressions.length;
  const counted = (test: (impression: Impression) => boolean): Rate =>
    rate(impressions.filter((impression) => test(impression)).length, n);
  return {
    week,
    template,
    holdback,
    shown: n,
    acceptance: counted((impression) => isAccepted(impression)),
    confirmedWithin10Minutes: counted((impression) => impression.outcome === 'confirmed' && within(impression)),
    dismissal: counted(({ outcome }) => outcome === 'dismissed'),
    ignored: counted((impression) => impression.outcome === 'shown' || !within(impression)),
  };
}

// One cell per week, template and arm with impressions, in that order. Pass only impressions shown at least 10
// minutes ago, whose outcome is settled.
export function suggestionCells(impressions: readonly Impression[]): SuggestionCell[] {
  return groupsOf(impressions, true).map((group) => cellOf(group));
}

const weightOf = ({ propensity }: Impression): number => 1 / propensity;

const sumOf = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);

// Self-normalised inverse propensity weighting: each impression weighs 1 / the probability it had of being shown, so
// that the templates the score favours do not crowd out the others' acceptance (research note 06 §3.3).
export function weightedAcceptance(impressions: readonly Impression[]): WeightedAcceptance[] {
  return groupsOf(impressions, false).map(({ template, holdback, impressions: group }) => {
    const weights = sumOf(group.map((impression) => weightOf(impression)));
    const acceptedWeights = sumOf(
      group.filter((impression) => isAccepted(impression)).map((impression) => weightOf(impression)),
    );
    return { template, holdback, shown: group.length, acceptance: weights === 0 ? null : acceptedWeights / weights };
  });
}
