/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { KINDS } from './expect.ts';
import { type RunScore } from './run-score.ts';
import {
  allCategories,
  averages,
  cost,
  count,
  FAILURE_KINDS,
  passedById,
  ratio,
  settingsOf,
  table,
  totalFailures,
} from './scorecard.ts';

// Two scored runs side by side (spec P19, "The scorecard"): the scorecard's measures with their differences, the
// settings that differ and the cases that changed. With about 60 cases one case is about 2 points of the whole set,
// so a small difference is noise.

interface Measure {
  label: string;
  // The fraction or number compared, null when there is none.
  value: number | null;
  shown: string;
  // A rate, compared in percentage points.
  rate: boolean;
}

function rate(label: string, part: number, whole: number): Measure {
  return { label, value: whole === 0 ? null : part / whole, shown: ratio(part, whole), rate: true };
}

function amount(label: string, value: number | null, shown = value === null ? '—' : count(value)): Measure {
  return { label, value, shown, rate: false };
}

function measuresOf(score: RunScore): Measure[] {
  const all = allCategories(score);
  const { turns, steps, latencyMs, tokens, costUsd } = score.usage;
  const { steps: averageSteps, latency } = averages(score);
  return [
    ...KINDS.map((kind) => rate(`Action recall, ${kind}`, score.recall[kind].recalled, score.recall[kind].expected)),
    rate('Tool selection accuracy', score.toolSelection.correct, score.toolSelection.turns),
    rate('Argument accuracy', score.args.matched, score.args.expected),
    rate('Over-calling', score.overCalling.withOver, score.overCalling.turns),
    rate('Under-calling', score.underCalling.withUnder, score.underCalling.turns),
    rate('Pass rate', all.passed, all.runs),
    ...Object.entries(score.categories).map(([name, { passed, runs }]) => rate(`Pass rate, ${name}`, passed, runs)),
    rate('Known failures passed', all.knownPassed, all.knownRuns),
    ...FAILURE_KINDS.map((kind) => amount(kind, totalFailures(score, kind))),
    rate(`pass^${score.passK.k === 0 ? 'k' : score.passK.k}`, score.passK.passedAll, score.passK.cases.length),
    amount('Average steps', turns === 0 ? null : steps / turns, averageSteps),
    amount('Average latency', turns === 0 ? null : latencyMs / turns / 1000, latency),
    amount('Tokens in', tokens.inputTokens),
    amount('Cache read', tokens.cacheReadTokens),
    amount('Cache write', tokens.cacheWriteTokens),
    amount('Tokens out', tokens.outputTokens),
    amount('Estimated cost', costUsd, cost(score)),
  ];
}

function difference(a: Measure | undefined, b: Measure | undefined): string {
  if (a === undefined || b === undefined || a.value === null || b.value === null) {
    return '—';
  }
  const change = b.value - a.value;
  const sign = change >= 0 ? '+' : '';
  if (a.rate) {
    return `${sign}${(change * 100).toFixed(1)} pp`;
  }
  return Number.isInteger(change) ? `${sign}${change}` : `${sign}${change.toFixed(2)}`;
}

function listed(heading: string, items: string[]): string {
  return `${heading}:\n\n${items.length === 0 ? '- none' : items.map((item) => `- ${item}`).join('\n')}`;
}

function measuresTable(a: RunScore, b: RunScore, nameA: string, nameB: string): string {
  const [measuresA, measuresB] = [measuresOf(a), measuresOf(b)];
  const labels = [...new Set([...measuresA, ...measuresB].map(({ label }) => label))];
  const rows = labels.map((label) => {
    const first = measuresA.find((measure) => measure.label === label);
    const second = measuresB.find((measure) => measure.label === label);
    return [label, first?.shown ?? '—', second?.shown ?? '—', difference(first, second)];
  });
  return table(['Measure', nameA, nameB, 'Difference'], rows);
}

function settingsTable(a: RunScore, b: RunScore, nameA: string, nameB: string): string {
  const [settingsA, settingsB] = [new Map(settingsOf(a)), new Map(settingsOf(b))];
  const rows = [...new Set([...settingsA.keys(), ...settingsB.keys()])]
    .filter((name) => settingsA.get(name) !== settingsB.get(name))
    .map((name) => [name, settingsA.get(name) ?? '—', settingsB.get(name) ?? '—']);
  return rows.length === 0 ? 'None.' : table(['Setting', nameA, nameB], rows);
}

// A case that passed in the first run and fails in the second is a regression, unless it is a known failure in
// either, which is listed apart.
function casesChanged(a: RunScore, b: RunScore, nameA: string, nameB: string): string[] {
  const [casesA, casesB] = [passedById(a), passedById(b)];
  const both = [...casesA.keys()].filter((id) => casesB.has(id));
  const known = (id: string): boolean =>
    (casesA.get(id)?.knownFailure ?? null) !== null || (casesB.get(id)?.knownFailure ?? null) !== null;
  const passedIn = (cases: typeof casesA, id: string): boolean => cases.get(id)?.passed === true;
  return [
    listed(
      'Regressions, passed and now failing',
      both.filter((id) => !known(id) && passedIn(casesA, id) && !passedIn(casesB, id)),
    ),
    listed(
      'Fixed, failed and now passing',
      both.filter((id) => !known(id) && !passedIn(casesA, id) && passedIn(casesB, id)),
    ),
    listed(
      'Known failures changed, never regressions',
      both
        .filter((id) => known(id) && passedIn(casesA, id) !== passedIn(casesB, id))
        .map((id) => `${id}: ${passedIn(casesA, id) ? 'passed, now fails' : 'failed, now passes'}`),
    ),
    listed(
      `Only in ${nameA}`,
      [...casesA.keys()].filter((id) => !casesB.has(id)),
    ),
    listed(
      `Only in ${nameB}`,
      [...casesB.keys()].filter((id) => !casesA.has(id)),
    ),
  ];
}

// Two scored runs side by side, with their differences, in Markdown.
export function compare(a: RunScore, b: RunScore): string {
  const nameA = a.saved.name;
  const nameB = b.saved.name === nameA ? `${nameA} (2)` : b.saved.name;
  return `${[
    `# Comparison: ${nameA} and ${nameB}`,
    'With about 60 cases one case is about 2 points of the whole set; small differences are noise.',
    measuresTable(a, b, nameA, nameB),
    '## Settings that differ',
    settingsTable(a, b, nameA, nameB),
    '## Cases',
    ...casesChanged(a, b, nameA, nameB),
  ].join('\n\n')}\n`;
}
