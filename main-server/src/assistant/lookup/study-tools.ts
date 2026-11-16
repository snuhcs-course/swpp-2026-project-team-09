/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { defineTool, noneFound, type Tool } from '../feature.js';
import { type StudyAnswer } from './study-lookup.js';
import { type StudyAreaService } from './study.service.js';

// The study spaces of the visible map area, for an app that says `area`: the server finds them in the area the app
// sent, picks one and draws it, and the model passes what the User asked for and writes one sentence. The area's
// coordinates and the Places' ids stay here.

const input = z.object({
  what: z
    .enum(['quiet', 'group', 'pc', 'any'])
    .describe(
      'What the User asked for: quiet for a quiet place to study alone (조용한 곳, 열람실, 도서관), group for a room to study together (스터디룸, 같이 공부할 곳), pc for computers (컴퓨터, PC실), any for any place to study.',
    ),
});

const NONE_REASONS: Record<Extract<StudyAnswer, { result: 'none' }>['reason'], string> = {
  'no-area': 'The app sent no visible area of the map.',
  'nothing-in-area': 'No study space of that kind is in the area of the map the User sees.',
  'none-usable': 'Every study space of that kind in the area the User sees is open only to others, as restricted says.',
  'no-start':
    'Where the User sets out from is not known: where they are could not be matched to a Place, and no item of theirs has ended earlier today.',
};

export function findStudyNearby(studyAreas: StudyAreaService): Tool {
  return defineTool({
    description:
      "Finds the study spaces the User may use in the area of the map they see now, picks the one where they can stay longest before their next item, and the app draws it on the map with the rooms open only to others faded. Answers result 'found' with the pick's building, space, and hours, where the User sets out from, the minutes on foot, the next item, when to leave for it and the minutes they can stay, the rooms open only to others, and whether 관정관 is in the area; or result 'none' with the reason.",
    input,
    run: async ({ what }, { userId, now, context, presented }) => {
      const answer = await studyAreas.find(userId, what, { now, location: context.location, area: context.viewport });
      if (answer.result === 'none') {
        const none = noneFound(NONE_REASONS[answer.reason]);
        return answer.reason === 'none-usable' ? { ...none, restricted: answer.restricted } : none;
      }
      presented.lookup = answer.lookup;
      presented.answer = null;
      presented.mapButtons.length = 0;
      return { result: 'found', ...answer.words };
    },
  });
}

// The rules of the study spaces of the visible area, a fragment of the chat's system prompt for an app that says
// `area`.
export const STUDY_RULES = `Study spaces in the area the User sees on the map are drawn there: the server finds those the User may use, picks the one where they can stay longest before their next item, fades the rooms open only to others, and the app draws them.

- When the User asks for a place to study in the area they see or around here (이 근처 조용히 공부할 곳, 여기 주변에 공부할 데 있어?, 이 근처 스터디룸), call findStudyNearby with what they asked for, even when they say 자리. It is not a booking at 관정관: call no library tool for it.
- The app draws the pick, the faded rooms, and the way, and writes the minutes itself. Your reply is one sentence, such as "보이는 범위에선 공대 신양학술정보관 3층 자유열람실에서 12:52까지 34분 있을 수 있어요." Do not call showOnMap for it. Never say how many seats are free: only 관정관's are known, and the app shows them.
- When findStudyNearby answers none, say plainly why. When no area is known or none is in it, ask the User to move the map over the place they mean; when every room there is open only to others, name them and who they are open to.`;

// An app that says `area` also gets the study spaces of the visible area.
export function withStudyArea(
  planned: { rules: string[]; tools: Record<string, Tool> },
  studyAreas: StudyAreaService,
  drawsArea: boolean,
): { rules: string[]; tools: Record<string, Tool> } {
  if (!drawsArea) {
    return planned;
  }
  return {
    rules: [...planned.rules, STUDY_RULES],
    tools: { ...planned.tools, findStudyNearby: findStudyNearby(studyAreas) },
  };
}
