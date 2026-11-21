/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Expect } from './expect.ts';
import { type ReplyTrace } from './trace.ts';

// What each check of a scored turn is called.
export type CheckName =
  | 'action'
  | 'tools.required'
  | 'tools.forbidden'
  | 'args'
  | 'proposal'
  | 'cards'
  | 'mapButtons'
  | 'text.mentions'
  | 'text.absent'
  | 'text.none'
  | 'steps';

// The reply's steps that differ from those expected, in order.
export function stepFailures(expected: NonNullable<Expect['steps']>, steps: ReplyTrace['steps']): string[] {
  const shown = (steps ?? []).map(({ kind, status, from }) => ({ kind, status, from: from?.label }));
  const failures = expected.flatMap((want, index) => {
    const got = shown[index];
    const wrong =
      got === undefined ||
      got.kind !== want.kind ||
      got.status !== want.status ||
      (want.from !== undefined && got.from !== want.from);
    return wrong ? [`step ${index + 1}: expected ${JSON.stringify(want)}, got ${JSON.stringify(got ?? null)}`] : [];
  });
  return shown.length > expected.length
    ? [...failures, `${shown.length} steps, expected ${expected.length}`]
    : failures;
}

// The check of the reply's steps, when the case expects some; none otherwise.
export function stepsChecks(
  { steps }: Pick<Expect, 'steps'>,
  reply: ReplyTrace | null,
): { name: CheckName; passed: boolean; detail: string }[] {
  if (steps === undefined) {
    return [];
  }
  const failures = stepFailures(steps, reply?.steps);
  return [{ name: 'steps', passed: failures.length === 0, detail: failures.join('; ') }];
}
