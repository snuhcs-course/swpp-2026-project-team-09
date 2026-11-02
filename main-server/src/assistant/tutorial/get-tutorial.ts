/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { z } from 'zod';
import { TutorialService } from '../../tutorial/tutorial.service.js';
import { defineTool, noneFound, type Tool } from '../feature.js';

// The 새내기 튜토리얼's content as the repository's tutorial.yaml holds it, and the User's status of each quest. Its text
// is the repository's own, so it is not wrapped as others' text. It never starts, completes or stops a quest.
export function getTutorial(tutorial: TutorialService): Tool {
  return defineTool({
    description:
      "Answers the 새내기 튜토리얼 (freshman tutorial): its state for the User and its quests (학생증, 행정관 셔틀, 관정도서관, 보건진료소, 미술관/파워플랜트), each with its text, 완료 조건, places, links and the User's status (notStarted, started, completed). Each quest's facts are what its sources state beyond the text, such as the 보건진료소's hours, departments, how to use it, cost and phone, each with its source. Give questKey for one quest, or none for all.",
    input: z.object({
      questKey: z.string().trim().min(1).max(40).optional().describe('One quest by its key, such as s-card.'),
    }),
    run: async ({ questKey }, { userId }) => {
      const { state, quests } = await tutorial.peek(userId);
      const facts = tutorial.facts();
      const chosen = questKey === undefined ? quests : quests.filter(({ key }) => key === questKey);
      if (chosen.length === 0) {
        return noneFound(
          `The tutorial has no quest ${questKey}. Its quests are ${quests.map(({ key }) => key).join(', ')}.`,
        );
      }
      return {
        result: 'found',
        state,
        total: quests.length,
        quests: chosen.map(({ key, order, title, brief, body, condition, places, links, status }) => ({
          key,
          order,
          title,
          brief,
          body,
          condition,
          places,
          links,
          facts: facts.get(key) ?? [],
          status,
        })),
      };
    },
  });
}
