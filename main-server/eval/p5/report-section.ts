/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type Measured, type P5Report, type Verdict } from './report.ts';

const ratio = ({ k, n }: Measured): string => (n === 0 ? '—' : `${k}/${n} (${((k / n) * 100).toFixed(1)}%)`);
const decimal = (value: number | null): string => (value === null ? '—' : value.toFixed(2));

function verdictText({ kind, comparator, value, passed }: Verdict): string {
  const answer = passed === null ? 'not measured' : passed ? 'PASS' : 'FAIL';
  return `${kind} ${comparator} ${Number(value.toFixed(3))}: ${answer}`;
}

// The suite's section of a scorecard, in Markdown.
export function p5Section(
  { metrics, subsets, stable }: P5Report,
  table: (header: string[], rows: string[][]) => string,
): string[] {
  return [
    '## The P05 suite',
    'k/n counts runs. G1 comes from `pnpm eval:compare` over the P19 baseline. A subset of five cases moves by 20% with one case, and a smaller improvement is a direction only.',
    table(
      ['Metric', 'Measured', 'Thresholds'],
      metrics.map(({ metric, k, n, verdicts }) => [
        metric,
        ratio({ k, n }),
        verdicts.map((verdict) => verdictText(verdict)).join('; '),
      ]),
    ),
    table(
      ['Subset', 'Cases', 'Micro precision', 'Micro recall', 'Mean precision', 'Mean recall', 'Exact set (E6)'],
      subsets.map((subset) => [
        subset.subset,
        String(subset.cases),
        ratio({ k: subset.right, n: subset.shown }),
        ratio({ k: subset.right, n: subset.expected }),
        decimal(subset.meanPrecision),
        decimal(subset.meanRecall),
        ratio(subset.exact),
      ]),
    ),
    `Join cases that passed all their runs (J5): ${ratio(stable)}.`,
  ];
}
