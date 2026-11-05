/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { type PlaceDto } from '../../places/dto/place.dto.js';
import { type CompiledRule } from '../../places/induced-rules.js';
import { audit, promote, type Standing } from './gate.js';
import { type Instance, instancesOf, type LabelRow, split } from './instances.js';
import { type Evolution, evolve, sameRule } from './loop.js';
import { type Reflector } from './reflector.js';

// One induction (P07 ticket 07), given its data: the instances from the rows, the loop over the training ones, the
// gate over the best candidate's new rules, and the audit of everything in force. The server runs it on its database
// (induction.service.ts) and `pnpm eval:induce` on a database's past, into a file.

export interface InductionInput {
  places: readonly PlaceDto[];
  rows: readonly LabelRow[];
  // Instances from elsewhere than the rows, such as the gold development set in the eval.
  extra?: readonly Instance[];
  active: readonly CompiledRule[];
  reflector: Reflector;
  budget: number;
  seed: number;
}

export interface InductionResult {
  instances: { train: number; heldOut: number };
  evolution: Evolution;
  promoted: Standing[];
  refused: Standing[];
  // Every rule in force after the run, counted again, and those retired by the audit.
  kept: Standing[];
  retired: Standing[];
}

export async function induce({
  places,
  rows,
  extra = [],
  active,
  reflector,
  budget,
  seed,
}: InductionInput): Promise<InductionResult> {
  const { train, heldOut } = split([...instancesOf(rows), ...extra]);
  const evolution = await evolve({ places, instances: train, root: active, reflector, budget, seed });
  const proposed = evolution.best.rules.filter((rule) => !active.some((known) => sameRule(known, rule)));
  const { promoted, refused } = await promote(places, active, proposed, train, heldOut);
  const { kept, retired } = await audit(places, [...active, ...promoted.map(({ rule }) => rule)], train, heldOut);
  return { instances: { train: train.length, heldOut: heldOut.length }, evolution, promoted, refused, kept, retired };
}
