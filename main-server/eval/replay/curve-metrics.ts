/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { type StageAnswer } from './stages.ts';
import { type Rate, rate } from './wilson.ts';

// What the learning curve scores (research note 05 §5): the `answered` Place rows a User later labelled, and how often
// the replayed matcher asks and is right on them.

export interface EventRow {
  id: string;
  userId: string;
  words: string;
  outcome: 'answered' | 'chosen' | 'edited' | 'rejected';
  chosenId: string | null;
  createdAt: Date;
}

export interface LabelledRow {
  row: EventRow;
  // The labels it got, oldest first.
  labels: EventRow[];
  // The Place the User finally chose, the last choice or edit among the labels; null when they only rejected.
  truth: string | null;
}

// Each `answered` row with the labels that answer it: the User's choices, edits and rejections of the same words after
// it and before their next `answered` row of those words. A row with no label is left out.
export function labelledRows(events: readonly EventRow[]): LabelledRow[] {
  const ordered = events.toSorted((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
  const open = new Map<string, LabelledRow>();
  const all: LabelledRow[] = [];
  for (const event of ordered) {
    const at = `${event.userId} ${event.words}`;
    if (event.outcome === 'answered') {
      const entry: LabelledRow = { row: event, labels: [], truth: null };
      open.set(at, entry);
      all.push(entry);
    } else {
      open.get(at)?.labels.push(event);
    }
  }
  const labelled = all.filter(({ labels }) => labels.length > 0);
  for (const entry of labelled) {
    entry.truth = entry.labels.findLast(({ outcome }) => outcome !== 'rejected')?.chosenId ?? null;
  }
  return labelled;
}

export interface Replayed {
  truth: string | null;
  // The matcher with the curated groups only (stage B), with the aliases learned before the point by the count
  // (stage C), and by the alias chain (stage D).
  rules: StageAnswer;
  learned: StageAnswer;
  chained: StageAnswer;
}

export interface CurveGroup {
  n: number;
  // Answered several, over the rows.
  askRules: Rate;
  askLearned: Rate;
  askChained: Rate;
  // The first candidate is the Place finally chosen, over the rows whose User chose one.
  top1Rules: Rate;
  top1Learned: Rate;
  top1Chained: Rate;
}

export function curveGroup(rows: readonly Replayed[]): CurveGroup {
  const chosen = rows.filter(({ truth }) => truth !== null);
  const asks = (pick: (row: Replayed) => StageAnswer): Rate =>
    rate(rows.filter((row) => pick(row).result === 'several').length, rows.length);
  const tops = (pick: (row: Replayed) => StageAnswer): Rate =>
    rate(chosen.filter((row) => pick(row).candidates[0] === row.truth).length, chosen.length);
  return {
    n: rows.length,
    askRules: asks(({ rules }) => rules),
    askLearned: asks(({ learned }) => learned),
    askChained: asks(({ chained }) => chained),
    top1Rules: tops(({ rules }) => rules),
    top1Learned: tops(({ learned }) => learned),
    top1Chained: tops(({ chained }) => chained),
  };
}
