/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-26  Fable 5.1  prompted by fyoon46
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { PlaceMatcher } from '../../places/place-matcher.js';
import { defineTool, type Tool } from '../feature.js';
import { resolved, settle } from './resolved.js';

const input = z.object({
  words: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .describe(
      "The User's words for the place, exactly as written: a building number such as 301동, a name such as 제1공학관, or a short form such as 학관 or ㅎㄱ.",
    ),
});

// A resolver: the campus Places the words name, as candidates of name, number and id, by the matcher's tiers (P07
// ticket 01): the exact name or building number, a taught alias, a short form the rules make from the name or its
// 초성, then looser matches, the first tier with hits answering. proposeQuest accepts the ids it returned.
export function resolvePlace(matcher: PlaceMatcher): Tool {
  return defineTool({
    description:
      "Finds the campus Place (a building) the User's words refer to, by name, building number or a short form such as 학관 or ㅎㄱ, for where a 파티 meets. Answers result 'one' with the Place, 'several' with the candidates, or 'none' with the reason. On 'several', ask the User which one, listing the names; on 'none', say there is no such Place.",
    input,
    run: async ({ words }, context) => {
      const { tier, source, places } = matcher.match(words, context.userId);
      const answer = resolved(
        places.map(({ id, name, number }) => ({ id, name, number })),
        `No Place is named ${words}, has the building number ${words} or is shortened to ${words}.`,
      );
      const labels = new Map(places.map(({ id, name }) => [id, name]));
      await settle(context, { kind: 'place', words, answer, labels, tier, aliasSource: source });
      return answer;
    },
  });
}
