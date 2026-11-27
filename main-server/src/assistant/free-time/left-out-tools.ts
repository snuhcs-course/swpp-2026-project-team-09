/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { defineTool, type Tool } from '../feature.js';
import { type DayItem } from './free-time.js';
import { dateInput } from './tool-parts.js';
import { idsOn, leftOutNow, skipOf, skippedWords, skipParameters } from './left-out-classes.js';
import { type UserDayService } from './user-day.service.js';

type Planned = { rules: string[]; tools: Record<string, Tool> };

// The asker's Classes left out for the conversation in words alone (P05 ticket 70): when no tool that plans or fills a
// time is called for the message, such as over a 파티 list, a day's Lookup or nothing on screen, the Class is still left
// out of every later answer of the conversation, and the tool of the answer or card on screen can then be called again.

const input = z.object({ date: dateInput, ...skipParameters });

export function leaveClassesOut(days: Pick<UserDayService, 'classesOn'>): Tool {
  const classesOn = (askerId: string, day: string): Promise<DayItem[]> => days.classesOn(askerId, day);
  return defineTool({
    description:
      "Leaves the User's own Classes of a day out of the conversation, or puts them back, without planning anything: every later answer, card and time card of the conversation reads that day without them. Answers result 'leftOut' with the Classes now left out that day, or result 'unknownClass' with the day's Classes when a word names none of them, or several.",
    input,
    run: async (args, { userId, context, presented }) => {
      const { date } = args;
      const skip = await skipOf(classesOn, { userId, date, context, presented }, args);
      if ('result' in skip) {
        return skip;
      }
      const ids = idsOn(leftOutNow({ context, presented }), date);
      return { result: 'leftOut', date, ...skippedWords(ids, skip.classes) };
    },
  });
}

// The rules of a Class left out, for every kind of answer, a fragment of the chat's system prompt for an app that draws
// answers. They state each rule by what it means.
export const LEFT_OUT_RULES = `The User may leave out one of their own Classes for the conversation, whatever they ask.

- A Class is left out only when the User says it is cancelled or that they will skip it (휴강이야, 수업 안 가, 째고, 빠질 거야), each by its start (1시 수업 → 13:00) or its name, several when they say several (오후 수업 다). It is left out of every answer, card and time card of the conversation that reads that day, of any kind: a meal, a meeting, a place or a seat to study, studying together, the day's events, and a 파티 to join or make. Never say that a Class can be left out of only one kind of answer.
- In the same message as what they ask (1시 휴강이니까 그 시간에 공부할 데, 1시 수업 빠질 건데 점심 뭐 먹지), pass skipClasses to the tool that answers it. When they only say it (1시 수업 휴강이야) over an answer or a card on screen, call that answer's or card's tool again with its conditions as they are and skipClasses: planMeal, planMeet, planStudy, planNewQuest or planEvents. With no such tool for what is on screen, or nothing on screen, call leaveClassesOut with the day, then call again the tool of what is on screen, if any.
- When a tool answers skipped, the answer leaves those Classes out, even when this message named none: your one sentence says so first, then what the answer says, such as "1시 수업을 빼고, 가장 덜 걷는 301동식당을 추천해요." or "1시 수업을 빼고, 18:00까지 있을 수 있는 중앙도서관을 추천해요.".
- When a tool answers result 'unknownClass', plan nothing: ask which of its classes they mean, by start and name.
- When they say they go after all (3시 수업은 가, 휴강 아니래), call the same tool with attendClasses.
- A Friend's Class is never left out: say that only the User's own Classes can be left out (지은이의 수업은 뺄 수 없어요), and answer as asked.
- A Class left out is not cancelled and the Timetable does not change. A Class that ends early or late is not changed: answers keep it as the Timetable has it, and every other item stays.
- A line [Classes left out: …] after the User's message gives the Classes the conversation leaves out: read the User's day without them.`;

// The Classes left out for the conversation, whatever is asked: the rules and the tool beside what an app that draws
// answers is given.
export function withLeftOut(planned: Planned, days: Pick<UserDayService, 'classesOn'>): Planned {
  return {
    rules: [...planned.rules, LEFT_OUT_RULES],
    tools: { ...planned.tools, leaveClassesOut: leaveClassesOut(days) },
  };
}
