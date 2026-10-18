/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { z } from 'zod';
import { FriendsService } from '../../friends/friends.service.js';
import { defineTool, type Tool } from '../feature.js';
import { othersText } from '../others-text.js';
import { givenIds, resolved } from './resolved.js';

const input = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .describe("The User's words for the Friend, exactly as written, without particles such as 랑: 민수, 김지은."),
});

function bare(words: string): string {
  return words.replaceAll(/\s/gu, '').toLowerCase();
}

// A resolver: the User's Friends whose name holds the words, ignoring spaces, as candidates of name and id. Only
// Friends, and never where they are. proposeQuest accepts the ids it returned.
export function resolveFriend(friends: FriendsService): Tool {
  return defineTool({
    description:
      "Finds the User's Friends a name the User wrote refers to, to invite to a 파티. Answers result 'one' with the Friend, 'several' with the candidates, or 'none' with the reason. On 'several', ask the User which one, listing the names; on 'none', say there is no Friend of that name.",
    input,
    run: async ({ name }, { userId, found }) => {
      const words = bare(name);
      const matched = (await friends.listFriends(userId)).filter((friend) => bare(friend.name).includes(words));
      const answer = resolved(
        matched.map(({ id, name: friendName }) => ({ id, name: othersText('friend.name', friendName) })),
        `No Friend of the User has a name holding ${name}.`,
      );
      found.add('friend', givenIds(answer));
      return answer;
    },
  });
}
