/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { FriendViewService } from '../../friends/friend-view.service.js';
import { defineTool, type Tool } from '../feature.js';
import { othersText } from '../others-text.js';
import { resolved } from './resolved.js';
import { WHICH_FRIEND } from './which-friend.js';

const input = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .describe("The User's words for the Friend, exactly as written, without particles such as 랑: 민수, 김지은."),
  department: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .describe(
      "The User's words for the Friend's department, when they gave some to tell Friends of one name apart: 경영, 컴퓨터공학부. Left out otherwise.",
    ),
});

function bare(words: string): string {
  return words.replaceAll(/\s/gu, '').toLowerCase();
}

// The full name less its first character, taken as a one-syllable surname, for names of three or more characters.
function givenName(name: string): string {
  return name.length >= 3 ? name.slice(1) : name;
}

// The Friends whose name holds the words and whose department holds the department's words, ignoring spaces and case.
// Those named exactly the words win, unless another one's given name is the words: "민수" may mean 김민수 as well as
// a Friend whose whole name is 민수.
export function friendsNamed<Friend extends { name: string; department: string }>(
  friends: readonly Friend[],
  name: string,
  department?: string,
): Friend[] {
  const words = bare(name);
  const departmentWords = bare(department ?? '');
  const matched = friends.filter(
    (friend) => bare(friend.name).includes(words) && bare(friend.department).includes(departmentWords),
  );
  const exact = matched.filter((friend) => bare(friend.name) === words);
  const alsoCalledSo = matched.some((friend) => bare(friend.name) !== words && givenName(bare(friend.name)) === words);
  return exact.length > 0 && !alsoCalledSo ? exact : matched;
}

// A resolver: the User's Friends the words name, as candidates of name, department and id. Only Friends, and never
// where they are. The tools that take a Friend accept the id of a 'one', and none of a 'several' until a later 'one'.
export function resolveFriend(friends: FriendViewService): Tool {
  return defineTool({
    description: `Finds the User's Friends a name the User wrote refers to, to invite to a 파티. Answers result 'one' with the Friend, 'several' with the candidates, each with full name and department, or 'none' with the reason. No tool takes a Friend of a 'several' until a later 'one' names them. On 'several', ask the User which one ${WHICH_FRIEND}; on 'none', say there is no Friend of that name.`,
    input,
    run: async ({ name, department }, { userId, found }) => {
      const matched = friendsNamed(await friends.list(userId), name, department);
      const answer = resolved(
        matched.map(({ id, name: friendName, department: friendDepartment }) => ({
          id,
          name: othersText('friend.name', friendName),
          department: othersText('friend.department', friendDepartment),
        })),
        department === undefined
          ? `No Friend of the User has a name holding ${name}.`
          : `No Friend of the User has a name holding ${name} and a department holding ${department}.`,
      );
      if (answer.result === 'one') {
        found.settle('friend', answer.candidate.id);
      }
      if (answer.result === 'several') {
        found.contest(
          'friend',
          answer.candidates.map(({ id }) => id),
        );
      }
      return answer;
    },
  });
}
