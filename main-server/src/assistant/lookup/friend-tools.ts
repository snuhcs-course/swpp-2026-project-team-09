/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { defineTool, noneFound, type Tool } from '../feature.js';
import { type FriendLookupService } from './friend.service.js';

// Where a Friend is, drawn on the map for an app that draws answers: the server reads the Friend through the Friend
// view and gives the model only what the asker's map shows, by Place names and clock times.

const input = z.object({
  friendId: z
    .uuid()
    .describe('The Friend, as resolveFriend returned them in this message, or as [Tapped: friend …] gives them.'),
});

export function findFriend(friends: FriendLookupService): Tool {
  return defineTool({
    description:
      "Shows where a Friend is with what the User's map shows of them, and the app draws it on the map. Answers result 'found' with the Friend's name, what they show the User (shows), the Place the map draws them at (place), until when their Class goes on (classUntil) or when it ended (classEnded), and their Timetable's label when the map does not draw them (timetable); or result 'none' with the reason.",
    input,
    run: async ({ friendId }, { userId, now, context, found, presented }) => {
      const tapped = context.tapped?.kind === 'friend' ? context.tapped.userId : null;
      found.refuseUnfound('friend', friendId === tapped ? [] : [friendId]);
      const answer = await friends.find(userId, friendId, now);
      if (answer === null) {
        return noneFound('That User is not a Friend of the User.');
      }
      presented.lookup = answer.lookup;
      presented.answer = null;
      presented.mapButtons.length = 0;
      return { result: 'found', ...answer.words };
    },
  });
}

// The rules of where a Friend is, a fragment of the chat's system prompt for an app that draws answers, which takes the
// place of the rule that the Assistant cannot see where anyone is.
export const FRIEND_RULES = `Where a Friend is is drawn on the map with what the User's map shows of them, and nothing more.

- When the User asks where a Friend is (민수 어디야?, 지은이 지금 어디 있어?), find the Friend with resolveFriend first, then call findFriend with their id. A line [Tapped: friend …] gives the Friend the User tapped (얘 어디야?): give it as friendId.
- Say only what findFriend returned. Never guess where a Friend is from anything else, and never offer to ask or tell them: the Assistant neither asks the Friend nor tells them.
- The app draws the Friend and writes the lines itself. Your reply is one sentence, such as "민수는 지금 302동이에요." or "민수는 12:15까지 302동 수업이에요." Do not call showOnMap for it.
- When resolveFriend answers several, ask which one, listing the names. When findFriend answers none, say that the User has no such Friend.`;
