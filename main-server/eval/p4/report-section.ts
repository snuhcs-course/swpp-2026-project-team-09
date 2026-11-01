/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { type RunScore, settingsOf } from '../run-score.ts';
import { type LayerScore, type Measured, type P4Report, type RateScore } from './report.ts';

type Table = (header: string[], rows: string[][]) => string;

const ratio = ({ k, n }: Measured): string => (n === 0 ? '—' : `${k}/${n} (${((k / n) * 100).toFixed(1)}%)`);

function verdictOf({ wanted, passed }: RateScore): string {
  const answer = passed === null ? 'not the whole suite' : passed ? 'PASS' : 'FAIL';
  return `>= ${wanted}: ${answer}`;
}

function layersTable(layers: readonly LayerScore[], table: Table): string {
  return table(
    ['Layer', 'Passed'],
    layers.map((layer) => [layer.layer, ratio(layer)]),
  );
}

const LAYERS_NOTE =
  'A run counts in a layer only when its case checks that layer. The action is read as if the words were right, so ' +
  'that a question or a "none" without its words fails in the words alone.';

// The suite's section of a scorecard, in Markdown.
export function p4Section({ rates, layers, wordsAlone, reworded }: P4Report, table: Table): string[] {
  const failedOnWords =
    wordsAlone.length === 0 ? 'None.' : wordsAlone.map(({ id, repetition }) => `- ${id}, run ${repetition}`).join('\n');
  return [
    '## The P4 suite',
    'k/n counts runs. Only these thresholds decide, and only on the whole suite. All the rest is a diagnostic.',
    table(
      ['Measure', 'Passed', 'Threshold'],
      rates.map((rate) => [rate.name, ratio(rate), verdictOf(rate)]),
    ),
    `### By layer\n\n${LAYERS_NOTE}`,
    layersTable(layers, table),
    `### The runs that failed on the reply's words alone\n\n${failedOnWords}`,
    `The 12 cases the holdout rewords, to set beside its pass rate: ${ratio(reworded)}.`,
  ];
}

// A run of the holdout, as much of it as is read: its rates, what it cost and its settings, and no case.
export function holdoutScorecard(score: RunScore, { rates, layers }: P4Report, table: Table, usage: string[]): string {
  const { name, stoppedBy } = score.saved;
  const sections = [
    `# Holdout scorecard: ${name}`,
    stoppedBy === null ? '' : `The run was stopped by its ${stoppedBy}: the cases after it did not run.`,
    '## The P4 holdout',
    'Only these rates are read. No holdout failure is opened until P11 is over, so this file names no case and holds ' +
      'no reply. Its pass rate is set beside that of the same 12 cases in the official run on this commit.',
    table(
      ['Measure', 'Passed'],
      rates.map((rate) => [rate.name, ratio(rate)]),
    ),
    `### By layer\n\n${LAYERS_NOTE}`,
    layersTable(layers, table),
    ...usage,
    '## Settings',
    table(['Setting', 'Value'], settingsOf(score)),
  ];
  return `${sections.filter((section) => section !== '').join('\n\n')}\n`;
}
