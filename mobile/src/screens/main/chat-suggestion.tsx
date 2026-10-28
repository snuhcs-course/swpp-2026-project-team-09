/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useQueryClient } from '@tanstack/react-query';
import { type ReactElement, useCallback } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { placesQuery } from '@/api/queries';
import type { Place } from '@/api/types';
import { color, Icon, radius, space, text, useToast } from '@/design-system';
import type { Chat } from '@/features/assistant/use-chat';
import { type Suggestion, useSuggestion } from '@/features/assistant/use-suggestion';
import { type MainRoute, NO_WAY } from './use-route';

// Where the chat opens from, the main screen: the Global Event whose card is open, if any, and its 길찾기, which a
// route suggestion draws with.
export interface ChatFrom {
  openEventId: string | null;
  routeTo: MainRoute['routeTo'];
}

const DISMISS = 48;

// The grey suggestion over the examples of the empty chat, while one is held: the request the main server thinks fits
// the moment, the reason under it in smaller type, and × to dismiss it. A press on the request runs it.
export function SuggestionRow({ suggestion }: { suggestion: Suggestion }): ReactElement | null {
  const { held, run, dismiss } = suggestion;
  if (held === null) {
    return null;
  }
  return (
    <View style={styles.row} testID="chat-suggestion">
      <Pressable
        accessibilityHint={held.reason}
        accessibilityLabel={held.text}
        accessibilityRole="button"
        onPress={run}
        style={({ pressed }) => [styles.request, pressed && styles.pressed]}
      >
        <Icon color={color.inkSubtle} name="sparkle" size={18} />
        <View style={styles.words}>
          <Text style={styles.text}>{held.text}</Text>
          <Text style={styles.reason}>{held.reason}</Text>
        </View>
      </Pressable>
      <Pressable accessibilityLabel="제안 닫기" accessibilityRole="button" onPress={dismiss} style={styles.dismiss}>
        <Icon color={color.inkSubtle} name="x" size={18} />
      </Pressable>
    </View>
  );
}

// A route suggestion's tap: hides the chat and draws the walking route to the Place as the map's 길찾기 does, where
// the campus's list of Places says it is.
function useSuggestedWalk(
  hide: () => void,
  routeTo: MainRoute['routeTo'],
): (place: { placeId: string; name: string }) => void {
  const queryClient = useQueryClient();
  const showToast = useToast();
  return ({ placeId, name }) => {
    hide();
    void queryClient
      .query(placesQuery)
      .catch((): Place[] => [])
      .then((places) => {
        const place = places.find(({ id }) => id === placeId);
        if (place === undefined) {
          showToast(NO_WAY);
          return;
        }
        routeTo({ title: name, position: { latitude: place.latitude, longitude: place.longitude } });
      });
  };
}

interface SuggestedSheet {
  suggestion: Suggestion;
  open: () => void;
  close: () => void;
  // Closes the sheet once 만들기 made a Quest from the Proposal card of this bubble, which a suggestion's tells.
  closeMade: (bubbleId: number, questId: string) => void;
}

// How the chat's sheet opens and closes, with its grey suggestion: opening asks for one, for the main screen and the
// event card open on it, and closing drops it. However the sheet closes, the keyboard goes down with it: the AI input
// would keep the focus otherwise.
export function useSuggestedSheet(chat: Chat, from: ChatFrom, setShown: (shown: boolean) => void): SuggestedSheet {
  const hide = useCallback((): void => {
    Keyboard.dismiss();
    setShown(false);
  }, [setShown]);
  const suggestion = useSuggestion(chat, useSuggestedWalk(hide, from.routeTo));
  const { opened, closed, made } = suggestion;
  const open = useCallback((): void => {
    setShown(true);
    opened({ screen: 'main', openEventId: from.openEventId });
  }, [setShown, opened, from.openEventId]);
  const close = useCallback((): void => {
    hide();
    closed();
  }, [hide, closed]);
  const closeMade = useCallback(
    (bubbleId: number, questId: string): void => {
      close();
      made(bubbleId, questId);
    },
    [close, made],
  );
  return { suggestion, open, close, closeMade };
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceSubtle,
  },
  request: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 56,
    paddingVertical: space[2],
    paddingLeft: 14,
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
  },
  pressed: { backgroundColor: color.surfaceSunken },
  words: { flex: 1, gap: 2 },
  text: { ...text.body, color: color.inkMuted },
  reason: { ...text.caption, color: color.inkMuted },
  dismiss: { alignItems: 'center', justifyContent: 'center', width: DISMISS, height: DISMISS },
});
