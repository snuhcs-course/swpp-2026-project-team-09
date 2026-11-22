/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import type { TextInputSelectionChangeEvent } from 'react-native';
import type { Mention } from '@/api/mention-types';
import { friendStatusesQuery, friendsQuery } from '@/api/queries';
import {
  editMentions,
  friendsMatching,
  insertMention,
  mentionParts,
  mentionQuery,
  mentionsOf,
  type PlacedMention,
  standing,
} from '@/features/assistant/mentions';

// A Friend the "@" list offers: the name, the department that tells two of one name apart, and the face.
export interface MentionFriend {
  userId: string;
  name: string;
  department: string;
  photo: string | null;
}

const NO_FRIENDS: readonly MentionFriend[] = [];

// The User's Friends, only they, in the order GET /friends gives them. None until they are known.
export function useMentionFriends(): readonly MentionFriend[] {
  const { data: friends } = useQuery(friendsQuery);
  const { data: statuses } = useQuery(friendStatusesQuery);
  return useMemo(() => {
    if (friends === undefined) {
      return NO_FRIENDS;
    }
    const photos = new Map((statuses ?? []).map(({ userId, photo }) => [userId, photo]));
    return friends.map(({ id, name, department }) => ({
      userId: id,
      name,
      department,
      photo: photos.get(id) ?? null,
    }));
  }, [friends, statuses]);
}

type Selection = { start: number; end: number } | undefined;

export interface Mentions {
  // The field's words cut into plain parts and mentions, which the field draws in the Friend colour.
  parts: { words: string; mention: boolean }[];
  // Whether a mention stands in the words: only then does the field draw its words as parts.
  shown: boolean;
  // The Friends the "@" being typed matches; empty while the list is closed.
  matches: readonly MentionFriend[];
  // The Friends the words mention, each once, sent with the message.
  mentions: Mention[];
  // The cursor the field is put at after a mention was put in or taken away; undefined otherwise.
  selection: Selection;
  onChangeText: (words: string) => void;
  onSelectionChange: (event: TextInputSelectionChangeEvent) => void;
  onFocus: () => void;
  onBlur: () => void;
  choose: (friend: MentionFriend) => void;
}

// The "@" mention of Friends in the AI input: typing "@" at the start or after a space lists the User's Friends, the
// words after it narrow them by name, and a press puts "@이름 " in as one mention, which one backspace takes away whole.
export function useMentions(
  message: string,
  setMessage: (message: string) => void,
  friends: readonly MentionFriend[],
): Mentions {
  const [placed, setPlaced] = useState<readonly PlacedMention[]>([]);
  const [cursor, setCursor] = useState(message.length);
  const [selection, setSelection] = useState<Selection>();
  const [focused, setFocused] = useState(false);
  const state = { text: message, placed };
  const query = focused && friends.length > 0 ? mentionQuery(state, Math.min(cursor, message.length)) : null;
  const put = (next: { text: string; placed: readonly PlacedMention[] }, at: number, moved: boolean): void => {
    setPlaced(next.placed);
    setMessage(next.text);
    setCursor(at);
    setSelection(moved ? { start: at, end: at } : undefined);
  };
  return {
    parts: mentionParts(state),
    shown: standing(state).length > 0,
    matches: query === null ? [] : friendsMatching(friends, query.query),
    mentions: mentionsOf(state),
    selection,
    onChangeText: (words) => {
      const edited = editMentions(state, words);
      put(edited.state, edited.cursor, edited.whole);
    },
    onSelectionChange: ({ nativeEvent }) => {
      setCursor(nativeEvent.selection.end);
      if (selection !== undefined) {
        setSelection(undefined);
      }
    },
    onFocus: () => {
      setFocused(true);
    },
    onBlur: () => {
      setFocused(false);
    },
    choose: (friend) => {
      if (query === null) {
        return;
      }
      const inserted = insertMention(state, { start: query.start, cursor }, friend);
      put(inserted.state, inserted.cursor, true);
    },
  };
}
