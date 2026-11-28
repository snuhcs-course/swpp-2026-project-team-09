/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AssistantReply, PlanInput, RequestContext } from '@/api/assistant-types';

// The main server's reply to a meal asked for a day out of reach ("다다음주"), to an app that says `answers` (P05 ticket
// 79): words alone; in `withdrawn` the answers on screen of the same meal; `clears` once nothing stays on screen.

const TEXT = '다다음주 월요일은 일주일보다 뒤라 계획할 수 없어요.';

// The main server's own name for a meal's request (`requestKey`), which the mock stands in for.
const keyOf = (input: PlanInput): string | null => (input.kind === 'meal' ? `meal ${input.date} ${input.meal}` : null);

// The answers on screen by their keys: the steps' answers in their order, else the one open.
function onScreen({ steps = [], answers = [], conditions }: RequestContext): [string, PlanInput][] {
  const keys = steps.flatMap(({ shows }) => (shows?.kind === 'answer' && shows.key !== undefined ? [shows.key] : []));
  if (keys.length > 0 && keys.length === answers.length) {
    return keys.flatMap((key, at) => {
      const input = answers[at];
      return input === undefined ? [] : [[key, input] as [string, PlanInput]];
    });
  }
  const key = conditions === null ? null : keyOf(conditions);
  return conditions === null || key === null ? [] : [[key, conditions]];
}

export function outOfReachReplyTo(words: string, context: RequestContext): AssistantReply | null {
  const meal = words.includes('저녁') ? 'dinner' : words.includes('점심') ? 'lunch' : null;
  if (!words.includes('다다음주') || meal === null) {
    return null;
  }
  const shown = onScreen(context);
  const withdrawn = shown.flatMap(([key, input]) => (input.kind === 'meal' && input.meal === meal ? [key] : []));
  const steps = context.steps ?? [];
  const stays = steps.length > 0 ? steps.some(({ shows }) => !withdrawn.includes(shows?.key ?? '')) : false;
  const empties = withdrawn.length > 0 && !stays;
  return {
    text: TEXT,
    mapButtons: [],
    cards: [],
    proposal: null,
    answer: null,
    answers: [],
    lookup: null,
    refusal: null,
    ...(withdrawn.length === 0 ? {} : { withdrawn }),
    ...(empties ? { clears: true as const } : {}),
  };
}
