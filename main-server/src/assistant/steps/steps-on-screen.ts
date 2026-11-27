/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply, type PlanInput, type ReplyStep, type RequestContext } from '../dto/answer.dto.js';
import { requestKey } from '../presented.js';

// The steps on screen as an app that says `answers` sends them back (P05 ticket 74), and the key each answer keeps.
//
// A key names the answer the first reply gave it to, and stays with it: the app keeps it when it recalculates the
// answer, though the new conditions may be another request (a Friend added makes a study place one together, the bar's
// other meal makes lunch dinner). So the server never rebuilds the key of an answer on screen from its conditions: it
// pairs them by their order, since `context.answers` comes in the order of the answer steps.

export interface OnScreen {
  // The steps sent back, each once: an answer's step without its key, which nothing can name, is left out.
  steps: ReplyStep[];
  // The conditions of each answer on screen, by its key.
  inputs: ReadonlyMap<string, PlanInput>;
  // The key on screen of each request whose answer is there, by the request.
  keys: ReadonlyMap<string, string>;
}

export const keyOf = ({ shows }: ReplyStep): string | null => (shows?.kind === 'answer' ? (shows.key ?? null) : null);

// What a step sent back is told apart by: its answer's key or its card's.
const idOf = ({ shows }: ReplyStep): string | null => (shows === null ? null : `${shows.kind} ${shows.key ?? ''}`);

export function onScreen({ steps = [], answers = [] }: Pick<RequestContext, 'steps' | 'answers'>): OnScreen {
  const kept = steps.filter((step, at) => {
    const id = idOf(step);
    const keyless = step.shows?.kind === 'answer' && step.shows.key === undefined;
    return !keyless && (id === null || steps.findIndex((other) => idOf(other) === id) === at);
  });
  const keyed = kept.flatMap((step) => {
    const key = keyOf(step);
    return key === null ? [] : [key];
  });
  // Paired by order; a list of another length is paired by the key its conditions would have.
  const pairs: [string, PlanInput][] =
    keyed.length === answers.length
      ? keyed.flatMap((key, at) => {
          const input = answers[at];
          return input === undefined ? [] : [[key, input] as [string, PlanInput]];
        })
      : answers.flatMap((input) => (keyed.includes(requestKey(input)) ? [[requestKey(input), input]] : []));
  return {
    steps: kept,
    inputs: new Map(pairs),
    keys: new Map(pairs.map(([key, input]) => [requestKey(input), key])),
  };
}

// The key of a request's answer: the one it has on screen, else its own.
export const keyFor = (screen: OnScreen, input: PlanInput): string =>
  screen.keys.get(requestKey(input)) ?? requestKey(input);

// The answers of the reply and the requests withdrawn, by the keys they have on screen.
export function withScreenKeys(
  screen: OnScreen,
  { answers, withdrawn }: { answers?: AnswerReply[]; withdrawn?: string[] },
): { answers?: AnswerReply[]; withdrawn?: string[] } {
  return {
    ...(answers === undefined
      ? {}
      : { answers: answers.map((answer) => ({ ...answer, key: keyFor(screen, answer.input) })) }),
    ...(withdrawn === undefined ? {} : { withdrawn: withdrawn.map((key) => screen.keys.get(key) ?? key) }),
  };
}
