/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { ConflictException } from '@nestjs/common';
import { z } from 'zod';
import { WORDS_MAX } from '../../interests/dto/interest.dto.js';
import { INTERESTS_MAX, type InterestsService } from '../../interests/interests.service.js';
import { defineTool, noneFound, type Tool } from '../feature.js';

// Watched interests, for an app that draws answers (ADR 0009): the server reads the topics and tells the User when an
// event or a recruiting party that matches comes up.

const words = z
  .string()
  .trim()
  .min(1)
  .max(WORDS_MAX)
  .describe('The kind of event or party, in the User’s words, such as 채용 관련 행사 or 배드민턴.');

export function watchInterest(interests: InterestsService): Tool {
  return defineTool({
    description:
      "Keeps an interest the User wants to be told about: from now on, a campus event or a recruiting party that matches it is marked on the map, and the User is told when one comes up. Answers result 'watching' with the words kept and the topics they were read as, or result 'none' with the reason.",
    input: z.object({ words }),
    run: async ({ words: said }, { userId }) => {
      try {
        const kept = await interests.watch(userId, said);
        return { result: 'watching', words: kept.words, topics: kept.topics };
      } catch (error) {
        if (error instanceof ConflictException) {
          return noneFound(
            `The User already watches ${String(INTERESTS_MAX)} interests, the most kept. One must be removed first.`,
          );
        }
        throw error;
      }
    },
  });
}

export function unwatchInterest(interests: InterestsService): Tool {
  return defineTool({
    description:
      "Stops watching the User's interest of these words, or whose topic they are. Answers result 'removed' with the words of what was removed, or result 'none' with the reason.",
    input: z.object({ words }),
    run: async ({ words: said }, { userId }) => {
      const removed = await interests.unwatch(userId, said);
      if (removed.length === 0) {
        return noneFound('The User watches no interest of these words.');
      }
      return { result: 'removed', words: removed.join(', ') };
    },
  });
}

export function interestTools(interests: InterestsService): Record<string, Tool> {
  return { watchInterest: watchInterest(interests), unwatchInterest: unwatchInterest(interests) };
}

// The rules of watched interests, a fragment of the chat's system prompt for an app that draws answers.
export const INTEREST_RULES = `The User can ask to be told when campus events or recruiting parties of a kind come up. The server reads what each one is about, marks the matches on the map, and tells the User of a new one.

- When the User asks to be told when events or recruiting parties of a kind come up ("채용 관련 행사 뜨면 알려 줘"), call watchInterest with the kind as the words, such as 채용 관련 행사.
- When the User asks to stop being told of a kind ("배드민턴 이제 그만 알려 줘"), call unwatchInterest with the kind as the words, such as 배드민턴.
- Only events and recruiting parties are watched. To be told later about a Friend (meeting or passing them) or about the shuttle, call refuse with not-watched-friend or not-watched-shuttle. For anything else, such as a free seat, say "지켜봐 드리는 것은 행사와 모집뿐이에요" and call no tool.
- When the words are too vague to match anything ("재밌는 거 뜨면 알려 줘"), ask which interest the User means, and call no tool.
- After watchInterest or unwatchInterest answers, say in one sentence what is watched now, or its reason when it answers none.`;
