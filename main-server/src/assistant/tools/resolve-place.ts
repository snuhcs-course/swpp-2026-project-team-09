/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-02  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-05  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { PlacesService } from '../../places/places.service.js';
import { defineTool, type Tool } from '../feature.js';
import { givenIds, resolved } from './resolved.js';

const input = z.object({
  words: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .describe(
      "The User's words for the place, exactly as written: a building number such as 301동, or a name such as 제1공학관.",
    ),
});

// The one Place named exactly the words, ignoring case, or numbered by them, when there is exactly one: "문화관" is
// 문화관, though 해동학술문화관 holds the words too. Otherwise every Place that matched. The app's search of Places keeps
// listing them all, as the User types.
export function exactlyNamed<Place extends { name: string; number: string | null }>(
  words: string,
  matched: readonly Place[],
): readonly Place[] {
  const number = words.replace(/동$/u, '');
  const exact = matched.filter((place) => place.name.toLowerCase() === words.toLowerCase() || place.number === number);
  return exact.length === 1 ? exact : matched;
}

// A resolver: the campus Places whose name holds the words or whose building number they are, as candidates of name,
// number and id, or only the one named exactly the words. proposeQuest accepts the ids it returned.
export function resolvePlace(places: PlacesService): Tool {
  return defineTool({
    description:
      "Finds the campus Place (a building) the User's words refer to, by name or building number, for where a 파티 meets or to search near it. Answers result 'one' with the Place, 'several' with the candidates, or 'none' with the reason. On 'several', ask the User which one, listing the names; on 'none', say there is no such Place.",
    input,
    run: async ({ words }, { found }) => {
      const matched = exactlyNamed(words, await places.search(words));
      const answer = resolved(
        matched.map(({ id, name, number }) => ({ id, name, number })),
        `No Place has a name holding ${words} or the building number ${words}.`,
      );
      found.add('place', givenIds(answer));
      if (answer.result === 'one') {
        found.addResolvedPlace(answer.candidate);
      }
      return answer;
    },
  });
}
