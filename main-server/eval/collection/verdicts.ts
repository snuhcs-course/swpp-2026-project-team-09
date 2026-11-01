/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type Rate, type ScoreA } from './score-a.ts';
import { type ScoreB } from './score-b.ts';
import { readCollectionFile, thresholdsSchema } from './sets.ts';

// Each threshold of thresholds.yaml against a run's scores. A rate with nothing to count passes or fails nothing.

export interface Verdict {
  id: string;
  metric: string;
  kind: 'floor' | 'target';
  threshold: string;
  measured: string;
  result: 'PASS' | 'FAIL' | 'n/a';
}

type Measured = Rate | number | null;

function measuresA({ c1, c2, c3, c4, c5, c6, c7 }: ScoreA): Record<string, Measured> {
  return {
    'c1.floor': c1,
    'c1.target': c1,
    'c2.floor': c2,
    'c2.target': c2,
    'c3.floor': c3.published,
    'c3.target': c3.published,
    'c4.schema.floor': c4.schema,
    'c4.start-precision.floor': c4.start.precision,
    'c4.start-precision.target': c4.start.precision,
    'c4.start-recall.target': c4.start.recall,
    'c5.floor': c5,
    'c5.target': c5,
    'c6.floor': c6,
    'c6.target': c6,
    'c7.floor': c7,
    'c7.target': c7,
  };
}

function measuresB({ d1, recallWithQueue, d3, d4, d6 }: ScoreB): Record<string, Measured> {
  return {
    'd1.floor': d1,
    'd1.target': d1,
    'd2.recall-with-queue.target': recallWithQueue,
    'd3.target': d3,
    'd4.target': d4,
    'd6.target': d6,
  };
}

function valueOf(measured: Measured): number | null {
  if (measured === null) {
    return null;
  }
  if (typeof measured === 'number') {
    return measured;
  }
  return measured.n === 0 ? null : measured.k / measured.n;
}

function shown(measured: Measured): string {
  if (measured === null) {
    return 'n/a';
  }
  return typeof measured === 'number' ? String(measured) : `${measured.k}/${measured.n}`;
}

function holds(value: number, comparator: string, threshold: number): boolean {
  if (comparator === '>=') {
    return value >= threshold;
  }
  return comparator === '<=' ? value <= threshold : value === threshold;
}

export function verdictsOf(score: { a: ScoreA } | { b: ScoreB }): Verdict[] {
  const measures = 'a' in score ? measuresA(score.a) : measuresB(score.b);
  const { thresholds } = readCollectionFile('thresholds.yaml', thresholdsSchema);
  return thresholds.flatMap(({ id, metric, kind, comparator, value }) => {
    const measured = measures[id];
    if (kind === 'diagnostic' || measured === undefined || comparator === undefined || value === undefined) {
      return [];
    }
    const number = valueOf(measured);
    return [
      {
        id,
        metric,
        kind,
        threshold: `${comparator} ${Number(value.toFixed(4))}`,
        measured: shown(measured),
        result:
          number === null ? ('n/a' as const) : holds(number, comparator, value) ? ('PASS' as const) : ('FAIL' as const),
      },
    ];
  });
}
