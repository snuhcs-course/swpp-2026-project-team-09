/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type MealInput, type PlanInput, type RequestContext } from './dto/answer.dto.js';
import { type NoneFound, type ToolContext } from './feature.js';
import { noDay } from './free-time/tool-parts.js';
import { isTogether } from './lookup/study-group.js';
import { type Drawn, requestKey, sameRequest, takeMap } from './presented.js';
import { keyOf, onScreen } from './steps/steps-on-screen.js';

// A request that ends with none: what the plan on screen becomes (P05 tickets 55 and 79). An app before `answers` is
// told the plan leaves the map (`clears`). An app that says `answers` is told the keys of the answers on screen that
// leave (`withdrawn`), since they may be of other requests than the one that ended, and `clears` only when nothing
// stays (`empties`).

// The request that ended with none, by what tells requests apart: its kind, for a meal its meal, for a study whether it
// is together. Its day and its other conditions do not count. `unrelated`: a refusal plainly not about the plans.
export type Failed =
  | { kind: 'meal'; meal: MealInput['meal'] | 'breakfast' }
  | { kind: 'study'; together: boolean }
  | { kind: Exclude<PlanInput['kind'], 'meal' | 'study'> }
  | { kind: 'unrelated' };

export function failedOf(input: PlanInput): Failed {
  if (input.kind === 'meal') {
    return { kind: 'meal', meal: input.meal };
  }
  return input.kind === 'study' ? { kind: 'study', together: isTogether(input) } : { kind: input.kind };
}

// Which answers on screen a request that ended with none takes off the map: the answer of the same request on another
// day or with other conditions (the same kind, the same meal, the same alone or together). The answers of other
// requests stay. A refusal plainly not about the plans takes them all off.
export function takenOff(failed: Failed, answers: ReadonlyMap<string, PlanInput>): string[] {
  const replaces = (input: PlanInput): boolean => {
    if (failed.kind === 'unrelated') {
      return true;
    }
    if (failed.kind === 'meal') {
      return input.kind === 'meal' && input.meal === failed.meal;
    }
    if (failed.kind === 'study') {
      return input.kind === 'study' && isTogether(input) === failed.together;
    }
    return input.kind === failed.kind;
  };
  return [...answers].flatMap(([key, input]) => (replaces(input) ? [key] : []));
}

// The answers on screen by their keys: those of the steps an app that says `answers` sends back, else the one open,
// under the key the server gave it (`requestKey`, its own and its recalculation's).
export function answersOnScreen(
  context: Pick<RequestContext, 'conditions' | 'answers' | 'steps'>,
): ReadonlyMap<string, PlanInput> {
  const { inputs } = onScreen(context);
  if (inputs.size > 0) {
    return inputs;
  }
  const { conditions } = context;
  return conditions === null ? new Map() : new Map([[requestKey(conditions), conditions]]);
}

// Whether nothing stays on screen once the answers of these keys leave: every step on screen is one of them, a booking
// step being none, or, with no steps, the one answer open is.
function leavesNothing(context: Pick<RequestContext, 'conditions' | 'answers' | 'steps'>, keys: string[]): boolean {
  const { steps } = onScreen(context);
  if (steps.length > 0) {
    return steps.every((step) => keys.includes(keyOf(step) ?? ''));
  }
  return context.conditions !== null && keys.includes(requestKey(context.conditions));
}

// The one way a tool ends a request with none. A refusal plainly not about the plans leaves nothing either.
export function endsWithNone(
  presented: Pick<Drawn, 'clears' | 'withdrawn' | 'empties'>,
  context: RequestContext,
  failed: Failed,
): void {
  presented.clears = true;
  const keys = takenOff(failed, answersOnScreen(context));
  if (keys.length > 0) {
    presented.withdrawn = [...(presented.withdrawn ?? []).filter((key) => !keys.includes(key)), ...keys];
  }
  if (failed.kind === 'unrelated' || leavesNothing(context, keys)) {
    presented.empties = true;
  }
}

// A request for a plan ended with none drawn: its answer leaves the reply, and the answers on screen it stood for leave
// the map. An app that says `answers` is also told its own key, so that an answer it drew earlier in the message leaves.
export function withdrawAnswer(presented: Drawn, input: PlanInput, context: RequestContext): void {
  takeMap(presented);
  presented.answer = null;
  if (presented.answers !== undefined) {
    presented.answers = presented.answers.filter((answer) => !sameRequest(answer.input, input));
  }
  const key = requestKey(input);
  presented.withdrawn = [...(presented.withdrawn ?? []).filter((each) => each !== key), key];
  endsWithNone(presented, context, failedOf(input));
}

// A plan asked for a day out of reach: none, and the answers on screen it stood for leave the map, so that the reply's
// words are not read over them.
export function outOfReachDay(
  date: string,
  { presented, context }: Pick<ToolContext, 'presented' | 'context'>,
  failed: Failed,
): NoneFound {
  endsWithNone(presented, context, failed);
  return noDay(date);
}
