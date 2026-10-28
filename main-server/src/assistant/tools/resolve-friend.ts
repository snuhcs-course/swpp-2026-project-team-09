/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { normaliseWords } from '../../common/normalise-words.js';
import { FriendsService } from '../../friends/friends.service.js';
import { AliasesService } from '../aliases/aliases.service.js';
import { defineTool, type Tool } from '../feature.js';
import { othersText } from '../others-text.js';
import { resolved, settle } from './resolved.js';

const input = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .describe("The User's words for the Friend, exactly as written, without particles such as 랑: 민수, 김지은."),
});

// A resolver: the User's Friends the User taught the words for (P07 ticket 03), or else those whose name holds the
// words, ignoring spaces, as candidates of name and id. Only Friends, and never where they are. proposeQuest accepts
// the ids it returned.
export function resolveFriend(friends: FriendsService, aliases: AliasesService): Tool {
  return defineTool({
    description:
      "Finds the User's Friends a name the User wrote refers to, to invite to a 파티. Answers result 'one' with the Friend, 'several' with the candidates, or 'none' with the reason. On 'several', ask the User which one, listing the names; on 'none', say there is no Friend of that name.",
    input,
    run: async ({ name }, context) => {
      const words = normaliseWords(name);
      const current = await friends.listFriends(context.userId);
      const taught = await aliases.taughtFriends(context.userId, words, current);
      const matched =
        taught.length > 0 ? taught : current.filter((friend) => normaliseWords(friend.name).includes(words));
      const answer = resolved(
        matched.map(({ id, name: friendName }) => ({ id, name: othersText('friend.name', friendName) })),
        `No Friend of the User has a name holding ${name}.`,
      );
      const labels = new Map(matched.map(({ id, name: friendName }) => [id, friendName]));
      const aliasSource = taught.length > 0 ? 'personal' : null;
      await settle(context, { kind: 'friend', words: name, answer, labels, aliasSource });
      return answer;
    },
  });
}
