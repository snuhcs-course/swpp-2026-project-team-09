/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { RequestContext } from '@/api/assistant-types';
import type { MentionedContext, Mention } from '@/api/mention-types';

// A Friend picked with "@" in the AI input, where "@이름" stands in the message: from `start` to `end`, "@" included and
// the space after it not.
export interface PlacedMention extends Mention {
  start: number;
  end: number;
}

// The input's words and the mentions in them.
export interface MentionedText {
  text: string;
  placed: readonly PlacedMention[];
}

// The longest words after "@" still taken as a search of the Friends.
const QUERY_MAX = 20;

function tokenOf(name: string): string {
  return `@${name}`;
}

// Those of the mentions that still stand in the words as they were put, so that words set from outside (a failed
// message put back, the field emptied by a send) never keep a mention that is not there.
export function standing({ text, placed }: MentionedText): PlacedMention[] {
  return placed.filter(({ start, end, name }) => text.slice(start, end) === tokenOf(name));
}

// The "@" being typed before the cursor and the words after it: an "@" at the start or after a space, outside every
// mention, with no line break after it. Null when none.
export function mentionQuery(state: MentionedText, cursor: number): { start: number; query: string } | null {
  const { text } = state;
  const before = text.slice(0, cursor);
  const start = before.lastIndexOf('@');
  if (start === -1 || (start > 0 && !/\s/u.test(text.charAt(start - 1)))) {
    return null;
  }
  const query = before.slice(start + 1);
  if (query.length > QUERY_MAX || query.includes('\n')) {
    return null;
  }
  if (standing(state).some((mention) => start >= mention.start && start < mention.end)) {
    return null;
  }
  return { start, query };
}

// The Friends whose name holds the words, in their order, ignoring case. Every Friend for no words.
export function friendsMatching<Friend extends { name: string }>(friends: readonly Friend[], query: string): Friend[] {
  const words = query.toLowerCase();
  return friends.filter(({ name }) => name.toLowerCase().includes(words));
}

// The words with "@이름 " in place of the "@" and the words being typed, and where the cursor goes: after the space.
export function insertMention(
  state: MentionedText,
  { start, cursor }: { start: number; cursor: number },
  friend: Mention,
): { state: MentionedText; cursor: number } {
  const token = tokenOf(friend.name);
  const put = `${token} `;
  const text = state.text.slice(0, start) + put + state.text.slice(cursor);
  const shift = put.length - (cursor - start);
  const kept = standing(state).flatMap((mention): PlacedMention[] => {
    if (mention.end <= start) {
      return [mention];
    }
    return mention.start >= cursor ? [{ ...mention, start: mention.start + shift, end: mention.end + shift }] : [];
  });
  const added = { userId: friend.userId, name: friend.name, start, end: start + token.length };
  return {
    state: { text, placed: [...kept, added].toSorted((one, other) => one.start - other.start) },
    cursor: start + put.length,
  };
}

// Where two words differ: the part of `before` from `from` to `to` was replaced by `inserted`.
function changeOf(before: string, after: string): { from: number; to: number; inserted: string } {
  let from = 0;
  while (from < before.length && from < after.length && before[from] === after[from]) {
    from += 1;
  }
  let fromEnd = 0;
  while (
    fromEnd < before.length - from &&
    fromEnd < after.length - from &&
    before[before.length - 1 - fromEnd] === after[after.length - 1 - fromEnd]
  ) {
    fromEnd += 1;
  }
  return { from, to: before.length - fromEnd, inserted: after.slice(from, after.length - fromEnd) };
}

// The words after an edit of the field, the cursor after it, and whether the edit took a whole mention away. One
// character deleted within a mention, or the space right after it, takes the whole "@이름 " away. Any other edit that
// touches a mention leaves its words as plain words; mentions after the edit move with it.
export function editMentions(
  state: MentionedText,
  after: string,
): { state: MentionedText; cursor: number; whole: boolean } {
  const placed = standing(state);
  const { from, to, inserted } = changeOf(state.text, after);
  const deletedOne = inserted === '' && to - from === 1;
  const hit = deletedOne
    ? placed.find(
        (mention) =>
          from >= mention.start && (from < mention.end || (from === mention.end && state.text[from] === ' ')),
      )
    : undefined;
  if (hit !== undefined) {
    const spaceAfter = state.text[hit.end] === ' ' ? 1 : 0;
    const removed = hit.end + spaceAfter - hit.start;
    const text = state.text.slice(0, hit.start) + state.text.slice(hit.end + spaceAfter);
    const kept = placed.flatMap((mention): PlacedMention[] => {
      if (mention === hit) {
        return [];
      }
      return mention.start > hit.start
        ? [{ ...mention, start: mention.start - removed, end: mention.end - removed }]
        : [mention];
    });
    return { state: { text, placed: kept }, cursor: hit.start, whole: true };
  }
  const shift = inserted.length - (to - from);
  const kept = placed.flatMap((mention): PlacedMention[] => {
    if (mention.end <= from) {
      return [mention];
    }
    if (mention.start >= to) {
      return [{ ...mention, start: mention.start + shift, end: mention.end + shift }];
    }
    return [];
  });
  return { state: { text: after, placed: kept }, cursor: from + inserted.length, whole: false };
}

// The Friends the words mention, each once, in the order they first stand.
export function mentionsOf(state: MentionedText): Mention[] {
  const seen = new Set<string>();
  return standing(state).flatMap(({ userId, name }) => {
    if (seen.has(userId)) {
      return [];
    }
    seen.add(userId);
    return [{ userId, name }];
  });
}

// The words cut into plain parts and the parts that are a mention.
export function mentionParts({ text, placed }: MentionedText): { words: string; mention: boolean }[] {
  const parts: { words: string; mention: boolean }[] = [];
  let at = 0;
  for (const { start, end } of standing({ text, placed })) {
    if (start > at) {
      parts.push({ words: text.slice(at, start), mention: false });
    }
    parts.push({ words: text.slice(start, end), mention: true });
    at = end;
  }
  if (at < text.length) {
    parts.push({ words: text.slice(at), mention: false });
  }
  return parts;
}

// A sent message's mentions found again in its words, for showing it back: each "@이름" of a mentioned Friend's name
// at the start or after a space. Longer names first, so that "@김민수" is never read as "@김민".
export function placedIn(text: string, mentions: readonly Mention[]): PlacedMention[] {
  const byLength = mentions.toSorted((one, other) => other.name.length - one.name.length);
  const placed: PlacedMention[] = [];
  for (let at = text.indexOf('@'); at !== -1; at = text.indexOf('@', at + 1)) {
    if (at > 0 && !/\s/u.test(text.charAt(at - 1))) {
      continue;
    }
    const mention = byLength.find(({ name }) => text.startsWith(tokenOf(name), at));
    if (mention !== undefined) {
      placed.push({ ...mention, start: at, end: at + tokenOf(mention.name).length });
    }
  }
  return placed;
}

// The request's context with what the User's last message was said of: the Friend or Place pressed, carried as
// `tapped`, and the Friends it mentions, left out when none.
export function withSaidOf(
  context: RequestContext,
  bubbles: readonly { role: string; tapped?: RequestContext['tapped']; mentions?: readonly Mention[] }[],
): MentionedContext {
  const { tapped, mentions = [] } = bubbles.findLast(({ role }) => role === 'user') ?? {};
  return {
    ...context,
    ...(tapped === undefined ? {} : { tapped }),
    ...(mentions.length === 0 ? {} : { mentions: [...mentions] }),
  };
}
