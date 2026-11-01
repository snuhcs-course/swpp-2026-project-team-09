/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { type RuleReport } from '../../src/assistant/induction/induction.service.js';
import { type CompiledRule, compileRules, PATTERN_MAX, REPLACE_MAX } from '../../src/places/induced-rules.js';

// The rules `pnpm eval:induce` writes (P07 ticket 07), read by the replay for stage E and by the learning curve: the
// rules in force after a run against the rows before `asOf`, with the words the reflector was shown, so that a gold
// item the run trained on is never scored with them. The held-out words are scored with them, though the gate read
// them: on them the score is a validation score, the test set being the only test.

export const ruleReportSchema = z.object({
  kind: z.enum(['name', 'words']),
  pattern: z.string().min(1).max(PATTERN_MAX),
  replace: z.string().min(1).max(REPLACE_MAX),
  example: z.string().nullable(),
  fixed: z.number(),
  broke: z.number(),
  accounts: z.number(),
  heldOutGain: z.number(),
});

export const rulesFileSchema = z.object({
  asOf: z.iso.datetime(),
  model: z.string(),
  budget: z.number(),
  seed: z.number(),
  trainedWords: z.array(z.string()),
  rules: z.array(ruleReportSchema),
  trace: z.unknown(),
});

export type RulesFile = z.infer<typeof rulesFileSchema> & { rules: RuleReport[] };

export interface InducedRulesFile {
  file: string;
  asOf: Date;
  trainedWords: ReadonlySet<string>;
  rules: CompiledRule[];
}

export function loadRulesFile(file: string): InducedRulesFile {
  const parsed = rulesFileSchema.parse(JSON.parse(readFileSync(file, 'utf8')));
  const { rules, refused } = compileRules(parsed.rules.map((rule, index) => ({ id: `${file}#${index}`, ...rule })));
  if (refused.length > 0) {
    throw new Error(`${file} holds rules the language refuses: ${refused.map(({ refusal }) => refusal).join(', ')}`);
  }
  return { file, asOf: new Date(parsed.asOf), trainedWords: new Set(parsed.trainedWords), rules };
}

function newest(files: readonly InducedRulesFile[]): InducedRulesFile | null {
  return files.toSorted((a, b) => b.asOf.getTime() - a.asOf.getTime())[0] ?? null;
}

// The newest file induced before `at`, for rows after it.
export function rulesAt(files: readonly InducedRulesFile[], at: Date): InducedRulesFile | null {
  return newest(files.filter(({ asOf }) => asOf.getTime() <= at.getTime()));
}

// The newest file induced before `at` that never saw the words, for a gold item.
export function rulesFor(files: readonly InducedRulesFile[], words: string, at: Date): InducedRulesFile | null {
  return newest(files.filter(({ asOf, trainedWords }) => asOf.getTime() <= at.getTime() && !trainedWords.has(words)));
}
