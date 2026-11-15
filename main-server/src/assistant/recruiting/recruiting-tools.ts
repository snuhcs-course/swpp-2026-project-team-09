/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type Plan, QUEST_IDS_MAX, type QuestsInput } from '../dto/answer.dto.js';
import { defineTool, noneFound, type Tool } from '../feature.js';
import { othersText } from '../others-text.js';
import { type QuestsPlanService } from './quests-plan.service.js';

// Recruiting Quests planned on the map, for an app that draws them (ADR 0009): the server decides which the User can
// reach before they start and how, the model passes the Global Event or the Quests and writes one sentence. Coordinates
// and ids of Places stay here.

const clock = (time: string | null | undefined): string | null =>
  time === null || time === undefined ? null : time.slice(11, 16);

// What the model is told of a plan, in words and minutes, with no coordinates.
function planWords({ title, place, startAt, togetherMinutes, parts, quest, friendNames }: Plan): object {
  const [part] = parts;
  return {
    title: othersText('quest.title', title),
    place: othersText('quest.place', place.label),
    start: clock(startAt),
    setOut: clock(part?.leaveAt),
    stayMinutes: togetherMinutes,
    leaveBy: clock(part?.leaveBy),
    holderCount: quest?.holderCount ?? null,
    capacity: quest?.capacity ?? null,
    join: quest?.joinPolicy === 'approval' ? 'askToJoin' : 'open',
    friends: friendNames ?? [],
  };
}

const questsInput = z
  .object({
    globalEventId: z
      .uuid()
      .optional()
      .describe(
        'The 파티 going to this Global Event: as resolveGlobalEvent or searchGlobalEvents returned it in this message, from [Cards shown: …], or the plan of [Plan on screen: …] of kind events. Left out with questIds.',
      ),
    questIds: z
      .array(z.uuid())
      .min(1)
      .max(QUEST_IDS_MAX)
      .optional()
      .describe('These 파티, as searchRecruitingQuests returned them in this message. Left out with globalEventId.'),
  })
  .refine(({ globalEventId, questIds }) => (globalEventId === undefined) !== (questIds === undefined), {
    message: 'Give globalEventId or questIds, not both',
  });

export function planQuests(plans: QuestsPlanService): Tool {
  return defineTool({
    description:
      "Plans the recruiting 파티 (Quests) the User could join: those going to a Global Event, or those a search returned. The server decides which the User can reach before they start, when they set out, and how long they can stay, those a Friend is in first, and the app draws the plans on the map. Answers result 'planned' with the plans in order, each with its title, place, start, setOut, stayMinutes, leaveBy, holderCount, capacity, join, and the Friends in it, or result 'none' with the reason.",
    input: questsInput,
    run: async ({ globalEventId, questIds }, { userId, now, context, found, presented }) => {
      found.refuseUnfound('quest', questIds ?? []);
      const planInput: QuestsInput = {
        kind: 'quests',
        globalEventId: globalEventId ?? null,
        questIds: questIds ?? null,
      };
      const answer = await plans.plan(userId, planInput, { now, location: context.location });
      presented.answer = answer;
      presented.lookup = null;
      presented.mapButtons.length = 0;
      if (answer.noPlan !== null) {
        return noneFound('No recruiting 파티 of these can be reached before it starts.');
      }
      return { result: 'planned', plans: answer.plans.map((plan) => planWords(plan)) };
    },
  });
}

// The rules of recruiting Quests planned on the map, joined or made, a fragment of the chat's system prompt for an app
// that draws events. They state each rule by what it means.
export const RECRUITING_RULES = `Recruiting 파티 to join, and a new one to recruit, are planned on the map: the server decides which the User can reach before they start, when everyone sets out, and how long they stay, and the app draws the plans.

- When the User asks for 파티 to join for an event (그 행사 같이 갈 파티, 민수가 있는 파티), call planQuests with the Global Event's id: as resolveGlobalEvent or searchGlobalEvents returned it in this message, from [Cards shown: …], or the plan of [Plan on screen: …] of kind events.
- When they ask for 파티 or people for an activity (배드민턴 칠 사람, 같이 운동할 파티), first call searchRecruitingQuests with words of the activity, pick the candidates that are that activity, and call planQuests with their ids.
- When they ask to recruit a new one (새로 모집, 새로 만들어 줘), or planQuests answers none, call planNewQuest with what they said: the Global Event, or the activity in their words as title with the ids searchRecruitingQuests returned for it; a Place they named, found with resolvePlace; a time they named, as HH:MM; Friends they named, found with resolveFriend; and the Board the activity plainly fits. When it answers needs-place or needs-time, ask the User where or when, in one question.
- The app draws the plans and writes their times, ways, and minutes itself, the first one first. Your reply is one sentence about the first plan only, such as "18:00 체육관 파티에 17:43에 나서면 돼요." Do not show them with showQuests and do not propose a 파티 with proposeQuest: the app draws them. Joining and making are the User's presses on the app: never say that they joined or that anything was made.
- When planQuests answers none, say plainly that no 파티 can be reached in time.`;
