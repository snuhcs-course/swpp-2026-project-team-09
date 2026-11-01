/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { heldBack } from '../../common/holdback.js';
import { ACCOUNT_AGE_DAYS, CHAIN_WINDOW_DAYS } from '../aliases/alias-rules.js';

// What the induction learns from and is scored on (P07 ticket 07): the labelled rows of the learning curve. Each
// `answered` Place row is followed by the same account's labels of the same words, a chip, an edit or a rejection,
// before its next `answered` row of those words; the truth is the Place of the last chip or edit, and rejections alone
// teach nothing. Only accounts 7 days old or more at the row (tickets 03 and 06) and rows of the last 90 days. One
// instance per words and truth, with the distinct accounts behind it; a stable hash of the words holds a fifth out,
// which the loop never sees and the gate scores (RuleChef's development split, research note 11 §3.2).

export const INSTANCE_WINDOW_DAYS = CHAIN_WINDOW_DAYS;
export const HOLDOUT_PERCENT = 20;

const AGE_MS = ACCOUNT_AGE_DAYS * 24 * 60 * 60 * 1000;

export interface LabelRow {
  id: string;
  userId: string;
  onboardedAt: Date | null;
  words: string;
  outcome: 'answered' | 'chosen' | 'edited' | 'rejected';
  chosenId: string | null;
  createdAt: Date;
}

export interface Instance {
  words: string;
  // The Place the words meant.
  placeId: string;
  accounts: string[];
  // The rows behind it, which a replay scoring them never learns from.
  eventIds: string[];
  heldOut: boolean;
}

interface Labelled {
  row: LabelRow;
  labels: LabelRow[];
}

function teaches({ onboardedAt, createdAt }: LabelRow): boolean {
  return onboardedAt !== null && createdAt.getTime() - onboardedAt.getTime() >= AGE_MS;
}

// Each `answered` row with the labels that answer it, in time order.
function labelledOf(rows: readonly LabelRow[]): Labelled[] {
  const ordered = rows.toSorted((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
  const open = new Map<string, Labelled>();
  const all: Labelled[] = [];
  for (const row of ordered) {
    if (row.words === '') {
      continue;
    }
    const at = `${row.userId} ${row.words}`;
    if (row.outcome === 'answered') {
      const entry: Labelled = { row, labels: [] };
      open.set(at, entry);
      all.push(entry);
    } else {
      open.get(at)?.labels.push(row);
    }
  }
  return all;
}

export function instancesOf(rows: readonly LabelRow[]): Instance[] {
  const grouped = new Map<string, Instance>();
  for (const { row, labels } of labelledOf(rows)) {
    const truth = labels.findLast(({ outcome }) => outcome !== 'rejected')?.chosenId ?? null;
    if (truth === null || !teaches(row)) {
      continue;
    }
    const at = `${row.words}\n${truth}`;
    const instance = grouped.get(at) ?? {
      words: row.words,
      placeId: truth,
      accounts: [],
      eventIds: [],
      heldOut: heldBack(row.words, HOLDOUT_PERCENT),
    };
    if (!instance.accounts.includes(row.userId)) {
      instance.accounts.push(row.userId);
    }
    instance.eventIds.push(row.id, ...labels.map(({ id }) => id));
    grouped.set(at, instance);
  }
  return [...grouped.values()];
}

// The instances the loop learns from, and those the gate scores.
export function split(instances: readonly Instance[]): { train: Instance[]; heldOut: Instance[] } {
  return {
    train: instances.filter(({ heldOut }) => !heldOut),
    heldOut: instances.filter(({ heldOut }) => heldOut),
  };
}
