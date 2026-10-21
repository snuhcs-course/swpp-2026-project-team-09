/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { readFileSync, writeFileSync } from 'node:fs';
import { outcomeOf } from './normalise.ts';
import {
  allCategories,
  averagesOf,
  passedById,
  type RunScore,
  scoreRun,
  settingsOf,
  totalFailures,
} from './run-score.ts';
import { type CaseScore } from './score.ts';
import { type FailureKind, type TurnTrace } from './trace.ts';

// The scorecard (spec P19, "The scorecard"): a scored run as Markdown, its headline the action recall per kind.
// eval/compare.ts puts two side by side with the same helpers.

export const FAILURE_KINDS: FailureKind[] = ['STEP_LIMIT', 'TIMEOUT', 'ERROR'];

// The replies listed in full for review: those of cases that accept REFUSE or CHAT, which the case's label decides,
// and those of the ambiguous-intent category, by its name in the case files.
const REVIEWED_ACTIONS = new Set(['REFUSE', 'CHAT']);
const REVIEWED_CATEGORIES = new Set(['ambiguous-intent']);

// The characters of a tool's input or result shown in a failed case's trace; the raw JSON keeps them whole.
const SHOWN_MAX = 300;

export function percent(part: number, whole: number): string {
  return whole === 0 ? '—' : `${((part / whole) * 100).toFixed(1)}%`;
}

export function ratio(part: number, whole: number): string {
  return `${part}/${whole} (${percent(part, whole)})`;
}

export function count(value: number): string {
  return value.toLocaleString('en-US');
}

function cut(text: string): string {
  return text.length > SHOWN_MAX ? `${text.slice(0, SHOWN_MAX)}…` : text;
}

export function table(header: string[], rows: string[][]): string {
  return [header, header.map(() => '---'), ...rows].map((row) => `| ${row.join(' | ')} |`).join('\n');
}

// Steps and latency per turn, as the scorecard shows them.
export function averages(score: RunScore): { steps: string; latency: string } {
  const { steps, latencySeconds } = averagesOf(score);
  return {
    steps: steps === null ? '—' : steps.toFixed(2),
    latency: latencySeconds === null ? '—' : `${latencySeconds.toFixed(1)} s`,
  };
}

// The estimated cost as the scorecard shows it; run-score.ts computes it.
export function cost(score: RunScore): string {
  const { costUsd } = score.usage;
  return costUsd === null ? '—' : `USD ${costUsd.toFixed(4)}`;
}

function stepsOf(trace: TurnTrace): string[] {
  return trace.steps.flatMap((step, index) => [
    `  ${index + 1}. finish ${step.finishReason ?? step.error ?? 'none'}, ${step.latencyMs} ms`,
    ...step.toolCalls.map((call) => {
      const answered = call.error ?? (call.result === undefined ? 'unfinished' : cut(JSON.stringify(call.result)));
      return `     - ${call.name} \`${cut(JSON.stringify(call.input))}\` → ${outcomeOf(call)}: \`${answered}\``;
    }),
  ]);
}

function quoted(text: string): string {
  return text
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
}

function titleOf({ run }: CaseScore): string {
  const repetition = run.repetition > 1 ? `, run ${run.repetition}` : '';
  const known = run.knownFailure === null ? '' : `, known failure: ${run.knownFailure}`;
  return `### ${run.id} (${run.category}${repetition}${known})`;
}

function failedCase(scored: CaseScore): string {
  const lines = [titleOf(scored), ''];
  for (const { index, trace, score } of scored.turns) {
    if (trace === null || score === null) {
      lines.push(`- Turn ${index + 1}: not run, the live case stopped before it.`);
      continue;
    }
    const failure = trace.failure === null ? '' : `; failed with ${trace.failure} (HTTP ${trace.status})`;
    lines.push(
      `- Turn ${index + 1}, "${trace.user}": took ${score.action ?? 'none'}, accepted ${score.accepted.join(' or ')}${failure}`,
      ...score.checks.filter(({ passed }) => !passed).map(({ name, detail }) => `  - ${name}: ${detail}`),
      '  - Steps:',
      ...stepsOf(trace),
    );
    if (trace.reply !== null) {
      lines.push(`  - Reply (${trace.reply.textLength} characters):`, '', quoted(trace.reply.text), '');
    }
  }
  if (scored.turns.length === 0) {
    lines.push('- The case has no expectation to score.');
  }
  return lines.join('\n');
}

function isReviewed({ run }: CaseScore, accepted: readonly string[]): boolean {
  return REVIEWED_CATEGORIES.has(run.category) || accepted.some((action) => REVIEWED_ACTIONS.has(action));
}

function reviewedReplies(score: RunScore): string[] {
  return score.cases.flatMap((scored) =>
    scored.turns.flatMap(({ index, trace, score: turn }) => {
      const reply = trace?.reply ?? null;
      if (trace === null || reply === null || turn === null || !isReviewed(scored, turn.accepted)) {
        return [];
      }
      const verdict = `Accepted ${turn.accepted.join(' or ')}, took ${turn.action ?? 'none'}, ${turn.passed ? 'passed' : 'failed'}.`;
      return [
        `${titleOf(scored)}, turn ${index + 1}`,
        '',
        `${verdict} "${trace.user}"`,
        '',
        quoted(reply.text),
        '',
        `${reply.textLength} characters`,
      ];
    }),
  );
}

function recallSection(score: RunScore): string[] {
  return [
    '## Action recall',
    'A turn counts toward the kinds of the action it took when the case accepts it, else of the first action the ' +
      'case accepts; it is recalled when the action it took is accepted and, when it asks, the text holds the ' +
      "case's mentions. Known failures are included.",
    table(
      ['Kind', 'Expected', 'Recalled', 'Recall'],
      score.recall.map(({ kind, expected, recalled }) => [
        kind,
        String(expected),
        String(recalled),
        percent(recalled, expected),
      ]),
    ),
  ];
}

function toolsSection(score: RunScore): string[] {
  const { toolSelection, args, overCalling, underCalling } = score;
  return [
    '## Tools',
    table(
      ['Measure', 'Value'],
      [
        ['Tool selection accuracy', ratio(toolSelection.correct, toolSelection.turns)],
        ['Argument accuracy', ratio(args.matched, args.expected)],
        ['Over-calling', `${ratio(overCalling.withOver, overCalling.turns)} of turns, ${overCalling.calls} calls`],
        ['Under-calling', `${ratio(underCalling.withUnder, underCalling.turns)} of turns, ${underCalling.calls} tools`],
      ],
    ),
  ];
}

function categoriesSection(score: RunScore): string[] {
  const all = allCategories(score);
  const rows = Object.entries(score.categories).map(([name, category]) =>
    [name, ratio(category.passed, category.runs), `${category.knownPassed}/${category.knownRuns}`].concat(
      FAILURE_KINDS.map((kind) => String(category.failures[kind])),
    ),
  );
  const total = ['**All**', ratio(all.passed, all.runs), `${all.knownPassed}/${all.knownRuns}`];
  const known = passedById(score);
  return [
    '## Pass rate per category',
    'Known failures are counted apart and never as regressions. Failure kinds count the scored turns that failed so.',
    table(
      ['Category', 'Passed', 'Known failures passed', ...FAILURE_KINDS],
      [...rows, [...total, ...FAILURE_KINDS.map((kind) => String(totalFailures(score, kind)))]],
    ),
    score.knownNowPassing.length === 0
      ? ''
      : [
          'Known failures that now pass, whose `knownFailure` mark is to be removed:',
          '',
          ...score.knownNowPassing.map((id) => `- ${id}: ${known.get(id)?.knownFailure ?? ''}`),
        ].join('\n'),
  ];
}

function passKSection({ passK }: RunScore): string[] {
  if (passK.cases.length === 0) {
    return ['## pass^k', 'No case ran more than once.'];
  }
  return [
    `## pass^${passK.k}`,
    `${ratio(passK.passedAll, passK.cases.length)} of the repeated cases passed every run.`,
    table(
      ['Case', 'Runs passed'],
      passK.cases.map(({ id, runs, passed }) => [id, `${passed}/${runs}`]),
    ),
  ];
}

function usageSection(score: RunScore): string[] {
  const { steps, latency } = averages(score);
  const { turns, tokens } = score.usage;
  return [
    '## Steps, latency and cost',
    table(
      [
        'Turns',
        'Average steps',
        'Average latency',
        'Tokens in',
        'Cache read',
        'Cache write',
        'Tokens out',
        'Estimated cost',
      ],
      [
        [
          String(turns),
          steps,
          latency,
          count(tokens.inputTokens),
          count(tokens.cacheReadTokens),
          count(tokens.cacheWriteTokens),
          count(tokens.outputTokens),
          cost(score),
        ],
      ],
    ),
  ];
}

// The scorecard of a scored run, in Markdown.
export function scorecard(score: RunScore): string {
  const { saved } = score;
  const failed = score.cases.filter(({ passed }) => !passed);
  const reviewed = reviewedReplies(score);
  const sections = [
    `# Scorecard: ${saved.name}`,
    saved.stoppedBy === null ? '' : `The run was stopped by its ${saved.stoppedBy}: the cases after it did not run.`,
    ...recallSection(score),
    ...toolsSection(score),
    ...categoriesSection(score),
    ...passKSection(score),
    ...usageSection(score),
    '## Settings',
    table(['Setting', 'Value'], settingsOf(score)),
    '## Failed cases',
    failed.length === 0 ? 'None.' : failed.map((scored) => failedCase(scored)).join('\n\n'),
    '## Replies to review',
    'Every reply of a case that accepts REFUSE or CHAT, and of the ambiguous-intent category, in full.',
    reviewed.length === 0 ? 'None.' : reviewed.join('\n'),
  ];
  return `${sections.filter((section) => section !== '').join('\n\n')}\n`;
}

// Scores a saved raw run again and writes its scorecard beside it, as <run>.md; answers the file.
export function saveScorecard(file: URL): URL {
  const score = scoreRun(JSON.parse(readFileSync(file, 'utf8')));
  const written = new URL(file.href.replace(/\.json$/u, '.md'));
  writeFileSync(written, scorecard(score));
  return written;
}
