/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { MEAL_WINDOWS } from '../travel/judgement-constants.js';
import { minuteOfDay } from './bare-hours.js';
import { type AskOffer } from './dto/assistant-messages.dto.js';
import { defineTool, type FeatureReply, type Presented, type Tool } from './feature.js';
import { clockTime } from './free-time/tool-parts.js';
import { withToward, withTopic } from './gathering/answer-words.js';

// A time of today the User named that has already passed (P05 ticket 80): the reply asks back before it answers,
// whatever was asked, and never moves the time to tomorrow on its own. "아침 7시에 도서관 갔다가 점심" at 11:13 gets "오늘
// 아침 7시는 지났어요. 내일로 볼까요?" with two buttons, 내일로 and 오늘 지금부터, which the app sends as the User's words,
// and the message plans and draws nothing until one is pressed. A meal asked for once it is over today asks the same way,
// with the next meal today and the same meal tomorrow (`mealAsk`).

// Where each part of the day ends, which the User may name alone: 아침 as the chat's windows read it, 점심 once lunch is
// no longer served, and 저녁 at the end of the evening, not of dinner, which a meal's own plan asks about.
const PARTS = {
  dawn: { words: '새벽', end: '06:00' },
  morning: { words: '아침', end: '11:00' },
  forenoon: { words: '오전', end: '12:00' },
  lunch: { words: '점심', end: MEAL_WINDOWS.lunch.to },
  evening: { words: '저녁', end: '22:00' },
} as const;

type DayPart = keyof typeof PARTS;

const minutesOf = (clock: string): number => {
  const [hours = 0, minutes = 0] = clock.split(':').map(Number);
  return hours * 60 + minutes;
};

// A clock time has passed once its minute is over, as a bare hour reads this minute as still to come; a part of the
// day, from its end on.
export function hasPassed(time: { at: string } | { part: DayPart }, now: Date): boolean {
  const minute = minuteOfDay(now);
  return 'at' in time ? minutesOf(time.at) < minute : minutesOf(PARTS[time.part].end) <= minute;
}

// What the reply asks: the time that passed as its question names it, the rest of the question, and its buttons, at
// most two, which the app sends as the User's words: the time on the next day, and what is left of today for it, left
// out when nothing is. Each case words its own (`namedTimeAsk`, and a meal's `mealAsk`).
export interface PastAsk {
  named: string;
  question: string;
  offers: AskOffer[];
}

export const askOffer = (label: string, text: string): AskOffer => ({ kind: 'ask', label, text });

const TOMORROW_LABEL = '내일로';
const NOW_LABEL = '오늘 지금부터';

// The words of the time named, without the 오늘 the question says itself.
const withoutToday = (named: string): string => named.replace(/^오늘\s*/u, '').trim();

// A clock time or a part of the day the User named: 내일로, at that time on the next day, or 오늘 지금부터.
export function namedTimeAsk(named: string): PastAsk {
  const words = withoutToday(named);
  return {
    named: words,
    question: `${TOMORROW_LABEL} 볼까요?`,
    offers: [askOffer(TOMORROW_LABEL, `내일 ${withToward(words)} 해 줘`), askOffer(NOW_LABEL, `${NOW_LABEL} 해 줘`)],
  };
}

// "오늘 아침 7시는 지났어요. 내일로 볼까요?", one shape for every case.
export const questionOf = ({ named, question }: Pick<PastAsk, 'named' | 'question'>): string =>
  `오늘 ${withTopic(named)} 지났어요. ${question}`;

// Puts the question under the reply: once for the message, whatever else of it asks, as several requests ask once.
export function askPast(presented: Presented, ask: PastAsk): void {
  presented.asks ??= { text: questionOf(ask), offers: ask.offers };
}

// The reply of a message that asked back: the question and its buttons alone. It draws nothing, so the answers on
// screen stay as they are, but for those a request of it took off, as a meal over for today takes its own (P05 tickets
// 55 and 79); and it keeps the Classes left out, which the User said. Null when it asked nothing.
export function askedReply(presented: Presented): FeatureReply | null {
  const { asks, withdrawn, clears, empties, leftOut } = presented;
  if (asks === undefined) {
    return null;
  }
  return {
    mapButtons: [],
    cards: [],
    proposal: null,
    answer: null,
    lookup: null,
    refusal: null,
    offers: asks.offers,
    ...(withdrawn === undefined ? {} : { withdrawn }),
    ...(clears === undefined ? {} : { clears }),
    ...(empties === undefined ? {} : { empties }),
    ...(leftOut === undefined ? {} : { leftOut }),
    text: asks.text,
    noTextFinishReason: null,
  };
}

// What the model is told of the buttons of a request with no time named that cannot be done today, such as "배고파"
// after dinner: a request for now, so they stand beside its sentence, and the rest of the message is answered as asked.
export const offeredWords = (ask: PastAsk): string =>
  `That is over for today. The app shows ${ask.offers.map(({ label }) => label).join(' and ')} under your sentence, which plan it as they say. Say only "${questionOf(ask)}"; name no other button.`;

// What the model is told once the app asks.
export const ASKED =
  'The app asks the User back, with its own question and buttons, and draws nothing for this message. Write nothing more and call no other tool.';

const NOT_PAST = 'That time has not passed today: plan it as asked, today.';

const input = z.object({
  named: z
    .string()
    .min(1)
    .describe('The time as the User wrote it, such as 아침 7시, 07:00 or 점심, without 오늘 or a word around it.'),
  at: clockTime
    .optional()
    .describe('The clock time named, in 24 hours, such as 07:00 for 아침 7시. Left out for a part of the day alone.'),
  part: z
    .enum(['dawn', 'morning', 'forenoon', 'lunch', 'evening'])
    .optional()
    .describe(
      'The part of the day named with no clock time: dawn for 새벽, morning for 아침, forenoon for 오전, lunch for 점심, evening for 저녁. Left out with a clock time.',
    ),
});

export function askPastTime(): Tool {
  return defineTool({
    description:
      "Asks the User back about a time of today they named that has passed, before anything is planned: the app shows its question and two buttons, 내일로 and 오늘 지금부터. The server checks the time against now. A meal named by 점심 or 저녁 alone is planMeal's, which asks itself. Answers result 'asked', or 'not-past' when the time is still to come today, or 'refused' when neither at nor part is given.",
    input,
    run: ({ named, at, part }, { now, presented }) => {
      const time = at === undefined ? (part === undefined ? null : { part }) : { at };
      if (time === null) {
        return Promise.resolve({
          result: 'refused',
          reason: 'Give at for a clock time, or part for a part of the day.',
        });
      }
      if (!hasPassed(time, now)) {
        return Promise.resolve({ result: 'not-past', reason: NOT_PAST });
      }
      askPast(presented, namedTimeAsk(named));
      return Promise.resolve({ result: 'asked', reason: ASKED });
    },
  });
}

const clockOf = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

// The rule for a time of today that has passed, with what is over now, sent with the time of the request to every answer
// kind, beside the Bare hours line.
export function pastTimeRule(now: Date): string {
  const parts = Object.values(PARTS);
  const over = parts.filter(({ end }) => minutesOf(end) <= minuteOfDay(now)).map(({ words }) => words);
  const ends = parts.map(({ words, end }) => `${words} ${end}`).join(', ');
  const overNow =
    over.length === 0 ? 'none of them is over yet' : `${over.join(', ')} ${over.length === 1 ? 'is' : 'are'} over`;
  return `Past times: now is ${clockOf(minuteOfDay(now))}, and of the parts of the day (each ends at: ${ends}) ${overNow}. When the User asks to plan or book something (a meal, studying, a seat or a room, events, a meet, a 파티, or several of these) for today, or with no other day, at a clock time before now with a word for the half of the day or in 24 hours (아침 7시, 07:00), or in a part of the day that is over, call askPastTime with that time first, before any other tool: the app asks whether to plan it tomorrow or today from now, and nothing is planned before they answer. Never move it to another day yourself. A question of facts, such as today's lunch menu or a way by a time, is answered by its own rules. A message that asks for several things asks once, for the first time that passed. A meal named by 점심 or 저녁 alone (점심 먹자) is planMeal's: call planMeal, which asks itself once that meal is over today. A bare hour is read by the Bare hours line and is never past; a request with no time is for now. When the User answers that question with a button's words, plan their message before it as they say: "내일 …로 해 줘" on the next day at the times they named, "오늘 지금부터 해 줘" today with the time that passed read as now, and "오늘 저녁으로 해 줘" that meal today.`;
}
