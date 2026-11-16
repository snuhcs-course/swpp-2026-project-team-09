/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type ReplyOffer } from '../dto/assistant-messages.dto.js';
import { type TutorialOrderService } from './tutorial-order.service.js';

// A Tutorial Quest's facts in words first, with 가는 길 보기 under them, and the way there, the stay, and the way on to
// the next item when it is pressed (P01-14, boards q11 and q12).

const OFFER_LABEL = '가는 길 보기';

// The words the button sends, which the rules send to findWay with the quest.
export const questWayText = (title: string): string => `${title} 가는 길`;

// 가는 길 보기 under the words of one quest that is done at a place.
export function questWayOffer(title: string): ReplyOffer {
  return { kind: 'ask', label: OFFER_LABEL, text: questWayText(title) };
}

// findWay's input of a quest.
export const QUEST_FIELD = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .optional()
  .describe(
    'The key of a 새내기 튜토리얼 quest, when the User asks the way to it ("{title} 가는 길"): the way goes to its place, stays there, and goes on to the User\'s next item. to and by are then left out.',
  );

// The end of findWay's description: every quest done at a place, by key and title.
export function questsNamed(tutorial: TutorialOrderService): string {
  const quests = tutorial
    .placedQuests()
    .map(({ key, title }) => `${key} (${title})`)
    .join(', ');
  return ` The 새내기 튜토리얼 quests done at a place, for quest: ${quests}.`;
}

export const QUEST_NONE_REASONS = {
  'no-quest': 'There is no such quest.',
  online: 'The quest is done online, at no place.',
  unmapped: "The quest's place is not on the walking table.",
  'no-start':
    'Where the User sets out from is not known: where they are could not be matched to a Place, and no item of theirs has ended earlier today.',
} as const;

// The rules of a quest's way, a fragment of the chat's system prompt for an app that draws answers.
export const QUEST_WAY_RULES = `A question about one 새내기 튜토리얼 quest is answered in words first, and its way on the map only when asked.

- When the User asks where or how to do one quest, or when it is open (학생증 어디서 받아?, 보건진료소 몇 시까지 해?), call getTutorial with that quest's questKey and answer in words from it: the place, how to do it, and the hours. Do not call findWay or showOnMap for it: the app shows a 가는 길 보기 button under your reply.
- The words "{quest title} 가는 길", which that button sends, ask the way to the quest's place, a stay there, and the way on to the User's next item: call findWay with quest, the quest's key, and from only when the User named where they set out from. Your reply is one sentence, such as "셔틀로 가면 12:08에 도착해 13:00 수업 전에 다녀올 수 있어요." When stay is null, say the place is closed then. Never say the quest is done.`;
