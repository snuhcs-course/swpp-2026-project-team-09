/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type StudyInput } from '../dto/answer.dto.js';
import { defineTool, noneFound, type Tool } from '../feature.js';
import { addDays } from '../library/booking-rules.js';
import { koreaDate } from '../korea-time.js';
import { type StudyPlanService } from './study-plan.service.js';
import { studyWords } from './study-plan-words.js';

// "공부할 자리 있어?" for an app that says `study-plan` (P10 ticket 04): the server ranks the study places and the app
// draws them on the map as it draws meal plans, numbered, the first opened. The model passes what the User asked for and
// writes one sentence.

// The furthest day a study place is planned for, as a meal is.
const DAYS_AHEAD = 7;

const clock = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/u, 'Expected HH:MM');

const input = z.object({
  what: z
    .enum(['quiet', 'group', 'pc', 'any'])
    .describe(
      'What the User asked for: quiet for a quiet place to study alone (조용한 곳, 열람실, 도서관), group for a room to study together (스터디룸, 같이 공부할 곳), pc for computers (컴퓨터, PC실), any for any place to study (공부할 자리, 공부할 데).',
    ),
  date: z.iso.date().optional().describe('The day asked for, YYYY-MM-DD in Korea. Leave it out for today.'),
  from: clock.optional().describe('HH:MM the User will start from, only when they said a time (3시부터).'),
  until: clock.optional().describe('HH:MM the User will study until, only when they said one (6시까지).'),
  near: z
    .boolean()
    .optional()
    .describe(
      'true when the User asked around the map they see or where they are: 근처, 이 근처, 이 주변, 여기서 가까운.',
    ),
});

const NO_AREA = 'The app sent no visible area of the map, so 근처 cannot be read.';

export function planStudy(studyPlans: Pick<StudyPlanService, 'plan'>): Tool {
  return defineTool({
    description:
      "Ranks the places to study the User may use, one per building: those known open when the User gets there first, then those whose hours are not known, each by the longest stay before the User's next item, then the shorter walk. The app draws them on the map, numbered, the first opened, with the buildings open only to others faded and those closed then listed apart. Answers result 'planned' with the plans in order (building, first space, whether its hours are known, when it closes, the walk and the stay), why the first comes first, and the dropped and closed buildings; or result 'none' with the reason. It never knows free seats.",
    input,
    run: async ({ what, date, from, until, near }, { userId, now, context, presented }) => {
      const today = koreaDate(now);
      const day = date ?? today;
      if (day < today || day > addDays(today, DAYS_AHEAD)) {
        return noneFound(`Study places are planned from today to ${DAYS_AHEAD} days ahead.`);
      }
      const area = near === true ? context.viewport : null;
      if (near === true && area === null) {
        return noneFound(NO_AREA);
      }
      const studyInput: StudyInput = {
        kind: 'study',
        date: day,
        what,
        people: [{ userId, constraints: [] }],
        window: { from: from ?? null, until: until ?? null },
        area,
        minutes: null,
        chosen: { seatSpaceId: null, roomSpaceId: null },
      };
      const answer = await studyPlans.plan(userId, studyInput, {
        now,
        location: context.location,
        locationMissing: context.locationMissing,
      });
      presented.answer = answer;
      presented.lookup = null;
      presented.mapButtons.length = 0;
      return studyWords(answer);
    },
  });
}

// The rules of a study answer, a fragment of the chat's system prompt for an app that says `study-plan`.
export const STUDY_PLAN_RULES = `Places to study are planned on the map: the server ranks the buildings with a place of the kind asked that the User may use, those known open first, and the app draws them numbered, the first opened, as it draws meal plans.

- When the User asks for a place or a seat to study and neither names a 관정도서관 space nor asks to book (공부할 자리 있어?, 공부할 데 있어?, 조용히 공부할 곳, 같이 공부할 곳, 컴퓨터 쓸 곳, 지금 공부할 곳), call planStudy with what they asked for, and date, from or until only when they said them, without asking back. With 근처, 이 근처, 이 주변 or 여기서 가까운, pass near: true. Call no library tool for it.
- A named 관정도서관 space (관정 7층 열람실, 관정 스터디룸) or a booking (관정 7층 예약해 줘, 자리 잡아 줘) stays with the library tools.
- Your reply is one sentence about the first plan and why it comes first, as planStudy's why says, such as "13:00 수업까지 가장 오래 있을 수 있는 공대 신양학술정보관을 추천해요." The app shows the rest. Never say how many seats are free or how full a place is: only 관정도서관's free seats are known, and the app shows them. Do not call showOnMap for it.
- A place whose hours are not known is never said to be open.
- When planStudy answers none, say its reason in one sentence.`;

// An app that says `study-plan` gets the study answer in the place of findStudyNearby, 근처 included (P10's decision of
// 2026-11-26).
export function withStudyPlan(
  planned: { rules: string[]; tools: Record<string, Tool> },
  studyPlans: Pick<StudyPlanService, 'plan'>,
  drawsStudy: boolean,
): { rules: string[]; tools: Record<string, Tool> } {
  if (!drawsStudy) {
    return planned;
  }
  return { rules: [...planned.rules, STUDY_PLAN_RULES], tools: { ...planned.tools, planStudy: planStudy(studyPlans) } };
}
