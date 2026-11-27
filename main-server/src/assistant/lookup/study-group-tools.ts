/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type StudyInput } from '../dto/answer.dto.js';
import { defineTool, noneFound, type Tool } from '../feature.js';
import { dateInput } from '../free-time/tool-parts.js';
import { gated, type LibraryServices } from '../library/library-parts.js';
import { WHICH_FRIEND } from '../tools/which-friend.js';
import { groupDates } from './study-group.js';
import { type StudyGroupService } from './study-group.service.js';
import { studyGroupWords } from './study-group-words.js';

// Studying together for an app that says `study-group` (P10 ticket 07): the server picks when everyone is free and the
// 관정 group study room for the head count, and the app draws the one plan with 동의 요청 보내기. Named nobody, the
// plan is the asker's alone, with how many more it needs, and the app opens its picking of Friends from it.

const clock = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/u, 'Expected HH:MM');

const input = z.object({
  friendIds: z
    .array(z.uuid())
    .max(20)
    .optional()
    .describe(
      'The Friends to study with, by the ids resolveFriend returned in this message. Leave it out when the User named nobody (같이 공부할 자리 있어?).',
    ),
  date: dateInput.optional().describe('The one day the User named, as YYYY-MM-DD.'),
  firstDay: dateInput
    .optional()
    .describe('The first day of a period the User named, such as 이번 주 (today to Sunday).'),
  lastDay: dateInput.optional().describe("The period's last day."),
  from: clock.optional().describe('HH:MM the User will start from, only when they said a time (3시부터).'),
  until: clock.optional().describe('HH:MM the User will study until, only when they said one (6시까지).'),
  minutes: z
    .int()
    .min(1)
    .max(1440)
    .optional()
    .describe('How long, in minutes, only when the User said a length: 2시간 is 120.'),
});

const DESCRIPTION =
  "Plans studying together in a 관정 group study room, drawn on the map as one plan whose button asks the Friends' consent. Give the Friends the User named (none when they named nobody), the one day as date or a period as firstDay and lastDay (neither for the days a room can be booked now), from or until only when the User said a time, and minutes only when they said a length (3 hours otherwise). The server picks the day and the start at which nobody is left out and the shortest stay is longest, and the smallest room for the head count. Answers 'planned' with the room, the time, each person's stay, how many more people the room needs (moreNeeded, 4 at the least), when the booking window opens for a day after it, the other days' best times, and why, the one sentence to say; or 'none' with the reason.";

export function planStudyGroup(groups: Pick<StudyGroupService, 'plan' | 'aheadDays'>, library: LibraryServices): Tool {
  return defineTool({
    description: DESCRIPTION,
    input,
    run: async (asked, toolContext) => {
      const blocked = gated(library, toolContext);
      if (blocked !== null) {
        return blocked;
      }
      const { userId, now, context, found, presented } = toolContext;
      const friendIds = [...new Set(asked.friendIds ?? [])];
      found.refuseUnfound('friend', friendIds);
      const dates = groupDates(asked, now, groups.aheadDays());
      const [date] = dates;
      if (typeof dates === 'string' || date === undefined) {
        return noneFound(typeof dates === 'string' ? dates : '날짜를 알려 주세요');
      }
      const studyInput: StudyInput = {
        kind: 'study',
        date,
        what: 'any',
        people: [userId, ...friendIds].map((id) => ({ userId: id, constraints: [] })),
        together: true,
        window: { from: asked.from ?? null, until: asked.until ?? null },
        area: null,
        minutes: asked.minutes ?? null,
        chosen: { seatSpaceId: null, roomSpaceId: null },
      };
      const { answer, otherDays } = await groups.plan(userId, studyInput, { now, location: context.location }, dates);
      presented.answer = answer;
      presented.lookup = null;
      presented.mapButtons.length = 0;
      return studyGroupWords(answer, otherDays);
    },
  });
}

// The rules of studying together, a fragment of the chat's system prompt for an app that says `study-group`.
export const STUDY_GROUP_RULES = `Studying together is planned on the map: the server picks when everyone is free and the 관정 group study room for the head count, and the app draws one plan whose button asks the Friends' consent.

- When the User asks to study together, with 같이, 친구랑, 스터디, 조모임 or 팀플 and a place or a time to study (같이 공부할 자리 있어?, 민수, 지은이랑 내일 스터디, 이번 주에 조모임할 데), and names no 관정도서관 room with a time to book, resolve each Friend they name with resolveFriend, then call planStudyGroup with their ids as friendIds (leave friendIds out when they named nobody), the day as date or a period as firstDay and lastDay (이번 주 is from today to Sunday) only when they said one, from or until only when they said a time, and minutes only when they said a length. Do not ask back for the time, the room or the Friends, and call no library tool for it. When resolveFriend answers several, ask which one ${WHICH_FRIEND}.
- 혼자, or a place to study asked with nothing of studying together, is studying alone: planStudyGroup is not for it.
- Your reply is planStudyGroup's why, as it gives it, such as "네 명이 모두 비는 내일 15:00에 관정 4층 6인실을 추천해요." or "그룹스터디룸은 네 명부터예요. 한 명만 더 부르면 돼요." The app shows the rest. Never say which rooms are free: the phone reads them. Do not call showOnMap for it.
- When planStudyGroup answers none, say its reason in one sentence.`;

// An app that says `study-group` gets the answer together in the place of proposeStudyRoom (P10, 2026-11-27).
export function withStudyGroup(
  planned: { rules: string[]; tools: Record<string, Tool> },
  groups: Pick<StudyGroupService, 'plan' | 'aheadDays'>,
  library: LibraryServices,
  drawsStudyGroup: boolean,
): { rules: string[]; tools: Record<string, Tool> } {
  if (!drawsStudyGroup) {
    return planned;
  }
  return {
    rules: [...planned.rules, STUDY_GROUP_RULES],
    tools: { ...planned.tools, planStudyGroup: planStudyGroup(groups, library) },
  };
}
