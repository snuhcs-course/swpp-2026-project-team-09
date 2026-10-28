/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 * 2026-10-28  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { type Rate, rate } from './wilson.ts';

// The acceptance curves of the grey suggestions (research note 06 §5) from suggestion_impressions: per week in Korea
// and template, held-back accounts apart, and each template's acceptance weighted by inverse propensity; and beside
// acceptance the missed needs and false alarms, as ProactiveBench counts them (research note 10 §1, ICLR 2025): a
// proposal accepted, a proposal rejected, and help needed but not proposed.

// One row of suggestion_impressions as the curves read it: `template` is null and the outcome `silent` when nothing was
// shown, `typedTemplate` the eligible template whose Proposal the User asked for in the chat within 10 minutes.
export interface Impression {
  template: string | null;
  eligible: string[];
  propensity: number | null;
  holdback: boolean;
  shownAt: Date;
  outcome: 'silent' | 'shown' | 'accepted' | 'dismissed' | 'confirmed';
  outcomeAt: Date | null;
  typedTemplate: string | null;
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

// Which slice of the rows a time falls in: the final slice, from `--final-from`, is never used to tune anything, and
// the numbers reported after tuning come from it alone (research note 10 §3). Without the flag every row is one slice.
export type Slice = 'all' | 'tuning' | 'final';

export function sliceOf(at: Date, finalFrom: Date | null): Slice {
  if (finalFrom === null) {
    return 'all';
  }
  return at.getTime() >= finalFrom.getTime() ? 'final' : 'tuning';
}

export interface SuggestionCell {
  slice: Slice;
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
  slice: Slice;
  template: string;
  holdback: boolean;
  shown: number;
  // Σ accepted / propensity over Σ 1 / propensity; null with no impression.
  acceptance: number | null;
}

// One template's missed needs and false alarms in a slice and arm.
export interface NeedCell {
  slice: Slice;
  template: string;
  holdback: boolean;
  shown: number;
  // Shown and accepted: ProactiveBench's true positives.
  accepted: Rate;
  // Shown and not accepted, over the shown: 100% less the acceptance, ProactiveBench's false-alarm rate.
  falseAlarm: Rate;
  // The rows where the template was eligible and another, or nothing, was shown.
  eligibleNotShown: number;
  // Of those, the rows where the User then asked for what the template would have proposed: the false negatives, over
  // the rows where it could have shown.
  missedNeed: Rate;
  // Accepted over accepted and missed.
  recall: Rate;
  // Shown, and the User typed what it suggested instead of tapping.
  typedWhatWasShown: number;
}

// The openings of a slice: every row, those that showed nothing, and of those the ones followed by a request a
// template would have covered.
export interface Openings {
  slice: Slice;
  openings: number;
  silent: number;
  silentThenTyped: number;
}

function within(impression: Impression): boolean {
  return impression.outcomeAt !== null && impression.outcomeAt.getTime() - impression.shownAt.getTime() <= SETTLED_MS;
}

function isAccepted({ outcome }: Impression): boolean {
  return outcome === 'accepted' || outcome === 'confirmed';
}

interface Group {
  slice: Slice;
  week: string;
  template: string;
  holdback: boolean;
  impressions: Impression[];
}

const arm = (holdback: boolean): string => (holdback ? 'holdback' : 'learning');

// The shown rows by slice, template and arm, and by week too when `byWeek`, in the order of their keys.
function groupsOf(impressions: readonly Impression[], finalFrom: Date | null, byWeek: boolean): Group[] {
  const groups = new Map<string, Group>();
  for (const impression of impressions) {
    const { template, holdback, shownAt } = impression;
    if (template === null) {
      continue;
    }
    const slice = sliceOf(shownAt, finalFrom);
    const week = byWeek ? koreaWeek(shownAt) : '';
    const at = `${slice} ${week} ${template} ${arm(holdback)}`;
    const group = groups.get(at) ?? { slice, week, template, holdback, impressions: [] };
    group.impressions.push(impression);
    groups.set(at, group);
  }
  return [...groups].toSorted(([a], [b]) => a.localeCompare(b)).map(([, group]) => group);
}

function cellOf({ slice, week, template, holdback, impressions }: Group): SuggestionCell {
  const n = impressions.length;
  const counted = (test: (impression: Impression) => boolean): Rate =>
    rate(impressions.filter((impression) => test(impression)).length, n);
  return {
    slice,
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

// One cell per slice, week, template and arm with shown rows, in that order. Pass only rows at least 10 minutes old,
// whose outcome is settled.
export function suggestionCells(impressions: readonly Impression[], finalFrom: Date | null = null): SuggestionCell[] {
  return groupsOf(impressions, finalFrom, true).map((group) => cellOf(group));
}

const weightOf = ({ propensity }: Impression): number => (propensity === null ? 0 : 1 / propensity);

const sumOf = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);

// Self-normalised inverse propensity weighting: each shown row weighs 1 / the probability it had of being shown, so
// that the templates the score favours do not crowd out the others' acceptance (research note 06 §3.3).
export function weightedAcceptance(
  impressions: readonly Impression[],
  finalFrom: Date | null = null,
): WeightedAcceptance[] {
  return groupsOf(impressions, finalFrom, false).map(({ slice, template, holdback, impressions: group }) => {
    const weights = sumOf(group.map((impression) => weightOf(impression)));
    const acceptedWeights = sumOf(
      group.filter((impression) => isAccepted(impression)).map((impression) => weightOf(impression)),
    );
    return {
      slice,
      template,
      holdback,
      shown: group.length,
      acceptance: weights === 0 ? null : acceptedWeights / weights,
    };
  });
}

function needCellOf(slice: Slice, template: string, holdback: boolean, rows: readonly Impression[]): NeedCell {
  const shown = rows.filter((row) => row.template === template);
  const accepted = shown.filter((row) => isAccepted(row)).length;
  const eligibleNotShown = rows.filter((row) => row.template !== template && row.eligible.includes(template));
  const missed = eligibleNotShown.filter((row) => row.typedTemplate === template).length;
  return {
    slice,
    template,
    holdback,
    shown: shown.length,
    accepted: rate(accepted, shown.length),
    falseAlarm: rate(shown.length - accepted, shown.length),
    eligibleNotShown: eligibleNotShown.length,
    missedNeed: rate(missed, eligibleNotShown.length),
    recall: rate(accepted, accepted + missed),
    typedWhatWasShown: shown.filter((row) => row.typedTemplate === template).length,
  };
}

// One cell per slice, template and arm over every row, the templates being all that were shown or eligible, in the
// order of their keys.
export function needCells(impressions: readonly Impression[], finalFrom: Date | null = null): NeedCell[] {
  const keys = new Map<string, { slice: Slice; template: string; holdback: boolean }>();
  const bySliceAndArm = new Map<string, Impression[]>();
  for (const row of impressions) {
    const slice = sliceOf(row.shownAt, finalFrom);
    const at = `${slice} ${arm(row.holdback)}`;
    bySliceAndArm.set(at, [...(bySliceAndArm.get(at) ?? []), row]);
    for (const template of new Set([...row.eligible, ...(row.template === null ? [] : [row.template])])) {
      keys.set(`${at} ${template}`, { slice, template, holdback: row.holdback });
    }
  }
  return [...keys]
    .toSorted(([a], [b]) => a.localeCompare(b))
    .map(([, { slice, template, holdback }]) =>
      needCellOf(slice, template, holdback, bySliceAndArm.get(`${slice} ${arm(holdback)}`) ?? []),
    );
}

// Every row by slice: the openings, the silent ones, and the silent ones the User then typed a covered request after.
export function openingsOf(impressions: readonly Impression[], finalFrom: Date | null = null): Openings[] {
  const slices = new Map<Slice, Openings>();
  for (const row of impressions) {
    const slice = sliceOf(row.shownAt, finalFrom);
    const counted = slices.get(slice) ?? { slice, openings: 0, silent: 0, silentThenTyped: 0 };
    counted.openings += 1;
    if (row.template === null) {
      counted.silent += 1;
      counted.silentThenTyped += row.typedTemplate === null ? 0 : 1;
    }
    slices.set(slice, counted);
  }
  return [...slices.values()].toSorted((a, b) => a.slice.localeCompare(b.slice));
}
