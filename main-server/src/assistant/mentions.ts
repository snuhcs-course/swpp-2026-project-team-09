/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type FriendViewService } from '../friends/friend-view.service.js';
import { type Mention } from './dto/answer.dto.js';
import { FoundIds } from './found-ids.js';
import { othersText } from './others-text.js';

// The Friends the User's message mentions with "@", as the app sends them, checked against the asker's Friends: an id
// that is not one of them is dropped, each Friend counts once, and the name is the Friend's own, never the app's.
// Only these reach the model and the tools. No Friend is looked up for a message without mentions.
export async function friendMentions(
  friends: Pick<FriendViewService, 'list'>,
  userId: string,
  mentions?: readonly Mention[],
): Promise<Mention[]> {
  if (mentions === undefined || mentions.length === 0) {
    return [];
  }
  const names = new Map((await friends.list(userId)).map(({ id, name }) => [id, name]));
  const seen = new Set<string>();
  return mentions.flatMap(({ userId: id }) => {
    const name = names.get(id);
    if (name === undefined || seen.has(id)) {
      return [];
    }
    seen.add(id);
    return [{ userId: id, name }];
  });
}

// The line after the User's message that names the Friends it mentions, by id: none without a mention.
export function mentionLines(mentions?: readonly Mention[]): string[] {
  if (mentions === undefined || mentions.length === 0) {
    return [];
  }
  const named = mentions.map(({ userId, name }) => `friend ${userId} ${othersText('friend.name', name)}`);
  return [`[Mentioned with @: ${named.join(', ')}]`];
}

// The ids a run's tools accept from its start: the mentioned Friends, as if a resolver had answered each alone.
export function foundWithMentions(mentions?: readonly Mention[]): FoundIds {
  const found = new FoundIds();
  for (const { userId } of mentions ?? []) {
    found.settle('friend', userId);
  }
  return found;
}

// The rule for that line, in every chat.
export const MENTION_RULES = `- A line [Mentioned with @: friend <id> <name>, …] names the Friends the User picked from their Friend list by @이름 in their message. Each is exactly that Friend, already found: give their id wherever a tool takes a Friend, never resolveFriend for those words, and never ask which one.`;
