/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 
 * 2026-11-27  Opus 5.5   prompted by fyoon46
******************************************************************************/

import { z } from 'zod';
import { type AnswerReply, type MeetInput, type Plan, type RequestContext } from '../dto/answer.dto.js';
import { defineTool, type Tool } from '../feature.js';
import { onDay } from '../free-time/free-time.js';
import { skipFor, skipParameters } from '../free-time/left-out-classes.js';
import { clockTime, dateInput, outOfReach, outOfReachDay } from '../free-time/tool-parts.js';
import { askedBy } from '../refusals/friend-question.js';
import { busyAt } from './busy-at.js';
import { relatedWords } from './meal-tool-words.js';
import { type MeetPlanned, type MeetPlanService } from './meet-plan.service.js';
import { FRIENDS_MAX, refuseUnseen } from './plan-tools.js';
import { timesAndWays } from './plan-times.js';

// A meet planned on the map, for an app that draws it: as for a meal, the server decides when and where, and the model
// passes the User's words as conditions and writes one sentence. Coordinates, ids of Places, course names, and rooms
// stay here.

const NONE_REASONS: Record<NonNullable<AnswerReply['noPlan']>['reason'], string> = {
  'no-menu': 'There is no place to meet.',
  'no-shared-time': 'The User and the Friends share no free time that day in the window.',
  'no-fit': 'There is no place where they can be together long enough.',
};

const input = z
  .object({
    date: dateInput,
    friendIds: z
      .array(z.uuid())
      .min(1)
      .max(FRIENDS_MAX)
      .describe(
        'The Friends to meet, as resolveFriend returned them in this message, or as [Plan on screen: …] or [Tapped: friend …] gives them.',
      ),
    from: clockTime
      .optional()
      .describe(
        'The earliest start the User allowed, as HH:MM (14시 이후): nobody is there before it. Left out when they gave none.',
      ),
    at: clockTime
      .optional()
      .describe(
        'The start the User fixed (두시에 만나는, 3시에 보자), as HH:MM: the plan starts then when everyone can be there, and the answer says who is busy when nobody can. Left out when they fixed none.',
      ),
    until: clockTime
      .optional()
      .describe('The end the User fixed, as HH:MM: everyone has left by it. Left out when they fixed none.'),
    placeId: z
      .uuid()
      .optional()
      .describe(
        'The Place to meet at, as resolvePlace returned it in this message, or as [Plan on screen: …] or [Tapped: place …] gives it. Left out for any.',
      ),
    questId: z
      .string()
      .min(8)
      .max(36)
      .optional()
      .describe(
        "The User's meeting to change (그거 3시로), by its ref in [Ahead: …] or findDay's answer. Left out otherwise: the server takes the meeting that day with the same Friends.",
      ),
    ...skipParameters,
  })
  .refine(({ from, until }) => from === undefined || until === undefined || from < until, 'Expected from before until');

const planWords = (plan: Plan): object => ({ place: plan.id, ...timesAndWays(plan) });

// The Friends and the Place of the meet on screen, and the ones tapped, which the model may give without resolving.
function seenIds({ conditions, tapped }: RequestContext): { friends: string[]; places: string[] } {
  const shown = conditions?.kind === 'meet' ? conditions : null;
  const placeOnScreen = shown?.placeId ?? null;
  return {
    friends: [
      ...(shown?.people.slice(1).map(({ userId }) => userId) ?? []),
      ...(tapped?.kind === 'friend' ? [tapped.userId] : []),
    ],
    places: [...(placeOnScreen === null ? [] : [placeOnScreen]), ...(tapped?.kind === 'place' ? [tapped.placeId] : [])],
  };
}

// Each person's constraints of the meet on screen, kept while it stays on the same day.
function constraintsOf(
  { conditions }: RequestContext,
  date: string,
): Map<string, MeetInput['people'][number]['constraints']> {
  if (conditions?.kind !== 'meet' || conditions.date !== date) {
    return new Map();
  }
  return new Map(conditions.people.map(({ userId, constraints }) => [userId, constraints]));
}

export function planMeet(plans: MeetPlanService): Tool {
  return defineTool({
    description:
      "Plans when the User and Friends can meet on a day from today to a week ahead, and where. The server decides the earliest time they are all free, the place where they are together longest among the places people gather and the buildings they are in, and when everyone is there, and the app draws the plans on the map. Answers result 'planned' with the plans in order, each with its place, start, end, togetherMinutes, and each person's way, or result 'none' with the reason.",
    input,
    run: async (args, { userId, now, context, capabilities, found, presented }) => {
      const { date, friendIds, from, until, at, placeId, questId } = args;
      if (outOfReach(date, now)) {
        return outOfReachDay(date, presented);
      }
      const skip = await skipFor(plans.classesOn, { userId, date, context, presented }, args);
      if ('result' in skip) {
        return skip;
      }
      const seen = seenIds(context);
      askedBy('planMeet', friendIds, found, presented);
      refuseUnseen(found, 'friend', friendIds, seen.friends);
      refuseUnseen(found, 'place', placeId === undefined ? [] : [placeId], seen.places);
      const kept = constraintsOf(context, date);
      const meetInput: MeetInput = {
        kind: 'meet',
        date,
        people: [userId, ...new Set(friendIds)].map((id) => ({ userId: id, constraints: kept.get(id) ?? [] })),
        window: { from: at ?? from ?? null, until: until ?? null },
        placeId: placeId ?? null,
      };
      const planned = await plans.planned(userId, meetInput, {
        now,
        location: context.location,
        setsAside: capabilities.has('plan-set'),
        skipped: skip.skipped,
        ...(questId === undefined ? {} : { questId }),
      });
      const { answer, held } = planned;
      if (held?.result === 'several') {
        return { result: 'several', meetings: held.kept.map((meeting) => plans.wordsOf(meeting)) };
      }
      if (held?.result === 'one' && !held.meeting.kept.mine) {
        return { result: 'set-by-friend', meeting: plans.wordsOf(held.meeting.kept) };
      }
      presented.answer = answer;
      presented.lookup = null;
      presented.mapButtons.length = 0;
      if (answer.noPlan !== null) {
        return { result: 'none', reason: NONE_REASONS[answer.noPlan.reason], ...skip.said };
      }
      return { ...plannedWords(plans, planned, at, at === undefined ? null : onDay(date, at)), ...skip.said };
    },
  });
}

// What the model is told of a meet planned: the meeting set aside, whether the start asked for holds and who is busy
// then, the plans, and the Quests of the asker's it touches.
function plannedWords(
  plans: MeetPlanService,
  { answer, people, held }: MeetPlanned,
  at: string | undefined,
  asked: Date | null,
): object {
  const [first] = answer.plans;
  const fits = asked === null || (first !== undefined && new Date(first.startAt).getTime() === asked.getTime());
  const busy = asked === null || fits ? [] : busyAt(people, asked);
  return {
    result: 'planned',
    ...(held?.result === 'one' ? { setAside: plans.wordsOf(held.meeting.kept) } : {}),
    ...(at === undefined ? {} : { asked: { at, fits, ...(fits ? {} : { busy }) } }),
    plans: answer.plans.map((plan) => planWords(plan)),
    ...relatedWords(answer.related),
  };
}

// The rules of a meet planned on the map, a fragment of the chat's system prompt for an app that draws it. They state
// each rule by what it means.
export const MEET_RULES = `A meet with Friends is planned on the map too: the server decides when the User and the Friends are free together, where they are together longest, and when everyone is there, and the app draws the plans.

- When the User wants to meet or see Friends they name, not for a meal (민수랑 만나고 싶어, 지은이 언제 볼 수 있어?), call planMeet with the day (today when they name none) and the Friends, each found with resolveFriend first.
- The app draws the plans and writes their times, ways, and minutes itself, the first one first. Your reply is one sentence about the first plan only, its place and when everyone is there, such as "12:15에 302동 앞에서 만나요." Write nothing more, and do not call showOnMap for a plan. When the User's way to the first plan is by the shuttle (나's by is a shuttle, with its stops), the sentence may say so in a few words, such as "셔틀로 가면 12:15에 302동 앞에서 만나요."; never call a way by the shuttle 걸어서.
- When planMeet answers related, the User already has those Quests that day, meetings or with a Friend asked for. Your sentence mentions the one that matters, such as "민수와는 내일 14:00 SK경영관 앞에서 약속이 이미 있어요", whether or not it limits the plans.
- A 파티 or 약속 only with Friends the User names, with or without a place and a time ("내일 이민수랑 학생회관에서 두시에 만나는 파티", "민수랑 3시에 보자"), is a meeting: call planMeet with those Friends, the place as placeId and the time as at, not proposeQuest. This comes before the rule for a closed 파티. proposeQuest still makes an open or approval 파티, or one with a capacity, a Board or a title the User gave.
- When planMeet answers asked with fits false, the first plan is the nearest time everyone can be there, and your one sentence says why the asked time does not fit and offers it: a Friend of the plan only by when their Class or Quest ends ("민수는 15:15까지 수업이에요. 15:20은 어때요?"), never what it is or where, and never anyone not in the plan; your own Class or Quest by its name ("내일 14:00엔 운영체제 수업이 있어요. 16:20은 어때요?"); with nobody busy, that it is the earliest everyone is there.
- When planMeet answers none, say plainly why, without naming who is busy.
- When planMeet answers setAside, the User already has that meeting, and the plans are what it would change to: your sentence names it and asks whether to change it, such as "이미 내일 14:00 SK경영관 앞에서 민수와 약속이 있어요. 15:20으로 바꿀까요?". When every one of its people declined it, changing it asks them again: say so, such as "민수가 거절한 내일 14:00 약속이 있어요. 15:20으로 다시 물어볼까요?". When they ask about it with nothing new to change (민수랑 내일 보자, with that meeting in [Ahead: …]), call findDay with its ref instead of planMeet and say that it is set; ask "시간을 바꿀까요?" only when findDay's answer says the app offers it.
- When planMeet answers set-by-friend, the meeting is one a Friend made: call findDay with its ref to show it, and say it is theirs to change, such as "내일 14:00 민수가 잡은 약속이 있어요. 바꾸려면 민수에게 말해 주세요."
- When planMeet answers several, the User has two or more meetings that day with those Friends: ask which one, by their times, and give its ref as questId when they answer.
- A line [Plan on screen: …] whose kind is meet gives the meet the app shows. To change it (14시부터, 학생회관에서 보자, 지은이도 불러 줘), call planMeet again with its date, friendIds, from, until, and placeId, changing only what the User changed: a Friend found with resolveFriend, a Place with resolvePlace, a start as from and an end as until.
- After a change, your reply is one sentence that says what changed.`;
