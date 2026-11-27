/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { defineTool, noneFound, type Tool } from '../feature.js';
import { presentLookup } from '../presented.js';
import { type TutorialAnswer } from './tutorial-lookup.js';
import { type TutorialOrderService } from './tutorial-order.service.js';
import { STARTS } from './way-tools.js';

// The Tutorial Quests in order on the map, for an app that draws answers: the server orders them before the User's
// next item and draws them, the model writes a short reply. Coordinates and ids stay here, and no quest is completed.

const NONE_REASONS: Record<Extract<TutorialAnswer, { result: 'none' }>['reason'], string> = {
  'no-start':
    'Where the User sets out from is not known: where they are could not be matched to a Place, and no item of theirs has ended earlier today.',
  'no-quests': 'The User has completed every quest of the tutorial that has a place; online lists those done online.',
  'no-fit': 'No quest fits before the next item; leftOut says why for each.',
};

export function findTutorialOrder(orders: TutorialOrderService): Tool {
  return defineTool({
    description:
      "Orders the 새내기 튜토리얼 quests the User has not completed and that have a place, so that as many as fit are done before their next item today, or by 18:00 with none, at most five, ending as early as possible, and the app draws them on the map numbered with their times. Answers result 'found' with where the User sets out from, each stop in order (at, quest, place, walkMinutes, and when, which says when it can be done), when all are done (doneAt), the next item, the minutes given to each stop (minutesPerStop), the quests left out with why (leftOut), and those done online (online); or result 'none' with the reason. It never starts or completes a quest.",
    input: z.object({
      from: z
        .uuid()
        .optional()
        .describe(
          'The Place the User sets out from, when they named one, as resolvePlace returned it in this message, or as [Tapped: place …] gives it. Left out to set out from where they are.',
        ),
    }),
    run: async ({ from }, { userId, now, context, found, presented }) => {
      const tapped = context.tapped?.kind === 'place' ? context.tapped.placeId : null;
      found.refuseUnfound('place', from === undefined || from === tapped ? [] : [from]);
      const answer = await orders.orderFor(userId, { fromPlaceId: from ?? null }, { now, location: context.location });
      if (answer.result === 'none') {
        return { ...noneFound(NONE_REASONS[answer.reason]), leftOut: answer.leftOut, online: answer.online };
      }
      presentLookup(presented, answer.lookup);
      return { result: 'found', ...answer.words, fromIs: STARTS[answer.start.basis] };
    },
  });
}

// The rules of the Tutorial Quests in order, a fragment of the chat's system prompt for an app that draws answers.
export const TUTORIAL_ORDER_RULES = `The 새내기 튜토리얼's quests are put in order on the map: the server orders the quests the User has not completed and that have a place, so that as many as fit are done before the User's next item with the shortest walk, and the app numbers them on the map with their times.

- When the User asks which Tutorial Quest to do first, or in what order (새내기 퀘스트 뭐부터?, 튜토리얼 어디부터 가?), call findTutorialOrder. A question about one quest (학생증 어디서 받아?) is answered with getTutorial, as before.
- When the User names where they set out from (301동에서), find that Place with resolvePlace first and give it as from. A line [Tapped: place …] gives the Place the User tapped (여기서): give it as from.
- The app draws the order and writes its times itself. Your reply is short: first what decides the order, such as "17:00 수업 전에 세 곳을 14:29까지 돌 수 있어요.", then the when of a stop that has one, such as "학생증은 MySNU 신청 다음 날부터 받아요." Name the quests left out with why, and those done online, in a few words. Do not call showOnMap for it.
- The User completes a quest in the quest itself: never say that a quest is done.
- When findTutorialOrder answers none, say why. When where the User sets out from is not known, ask where they set out from; once they say, find the Place with resolvePlace and call findTutorialOrder again with it as from. Otherwise say that every quest with a place is completed, naming those done online, or that none fits, with why for each.`;
