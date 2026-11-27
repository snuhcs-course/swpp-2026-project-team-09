/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReplyStep } from '@/api/assistant-types';
import { dueStepOf } from './steps-scene';
import type { ChatBubble } from './use-chat';

// Which step of several is chosen, when the steps name their answers by key (P03 ticket 21). The user decided these
// rules on 2026-11-28 ("우선 모두 권장대로 진행해줘") and will change them from use, so each is one function here.
// Steps without keys, from a main server before P05 ticket 74 or to an app that does not say `answers`, keep the rule of
// before: the step due first on every new reply.

// A step's name across replies: its answer's key, its card's key, else its kind and title (a booking refused).
export function stepIdOf({ shows, kind, title }: ReplyStep): string {
  if (shows?.kind === 'answer' && shows.key !== undefined) {
    return `answer ${shows.key}`;
  }
  return shows?.kind === 'card' ? `card ${shows.key}` : `${kind} ${title}`;
}

const keyOf = ({ shows }: ReplyStep): string | null => (shows?.kind === 'answer' ? (shows.key ?? null) : null);

const indexOf = (steps: readonly ReplyStep[], id: string | null): number =>
  id === null ? -1 : steps.findIndex((step) => stepIdOf(step) === id);

// Rule 1 and 2: the step chosen as a reply with steps arrives. The step of the plan the reply chose in words
// (`select.key`) first. On the first reply of several requests, the step due first. On a later one, the first step in
// their order whose answer the reply drew or changed; if none, the step chosen before while it is still there; else the
// step due first.
export function chosenOnReply(
  steps: readonly ReplyStep[],
  reply: Pick<ChatBubble, 'answers' | 'selectKey'>,
  before: string | null,
  now: Date,
): number {
  const due = dueStepOf(steps, now);
  const selected = steps.findIndex((step) => reply.selectKey !== undefined && keyOf(step) === reply.selectKey);
  if (selected >= 0) {
    return selected;
  }
  if (before === null) {
    return due;
  }
  const drawn = new Set((reply.answers ?? []).flatMap(({ key }) => (key === undefined ? [] : [key])));
  const changed = steps.findIndex((step) => drawn.has(keyOf(step) ?? ''));
  if (changed >= 0) {
    return changed;
  }
  const kept = indexOf(steps, before);
  return kept >= 0 ? kept : due;
}

// Rule 7: a Lookup the steps' reply gave takes the map for that turn, and its card stands under the steps card, which
// stays with its step chosen; the step's answer comes back with the next reply that draws one (P03 ticket 23). Words
// alone keep the steps and put no card under them.
export const lookupTakesTheMap = (reply: Pick<ChatBubble, 'lookup'> | undefined): boolean =>
  (reply?.lookup ?? null) !== null;

// Rule 6: no other step is chosen while Friends are being picked in the time card ("+ 같이").
export const mayChooseStep = ({ adding }: { adding: boolean }): boolean => !adding;

// Rule 3: coming back to a step shows the plan the User was last on in it, with the answer as last recalculated
// (`useStepAnswer` keeps them by key); a step never seen opens at its answer's first plan.
export const firstSeenIndex = 0;
