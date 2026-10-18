/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { type ReactElement, useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MapLayer } from '@/api/assistant-types';
import { questsQuery } from '@/api/queries';
import { Button, color, font, Icon, space } from '@/design-system';
import { type Chat, useChat } from '@/features/assistant/use-chat';
import { useBackToClose } from '@/hooks/use-back-to-close';
import type { PostView } from '@/features/party/posts';
import { EventSheets, useEventSheets } from '../events/event-sheets';
import { JoinSheet } from '../party/join-sheet';
import { openPost } from '../party/post-card';
import { usePartyActions } from '../party/use-party-actions';
import { type CardActions, ChatBubbles, ChatEmpty } from './chat-bubbles';
import type { EventCardActions } from './chat-event-cards';
import type { QuestCardActions } from './chat-quest-cards';
import { AI_INPUT } from './layout';

interface ChatSheetProps {
  chat: Chat;
  // While the main screen is in front: Android's back button closes the sheet only then.
  inFront: boolean;
  onClose: () => void;
  // A map button of an answer: closes the sheet and turns that layer on.
  onShowLayer: (layer: MapLayer) => void;
  // An event card of an answer: closes the sheet and opens the 행사 tab at that event.
  onOpenEvent: (globalEventId: string) => void;
  // A Quest card of an answer: closes the sheet and opens its post.
  onOpenPost: (questId: string) => void;
  // The AI input's field, which lies over the sheet's bottom.
  inputHeight: number;
}

const HEADER = 56;
const CHAT_ICON = 32;
const CLOSE = 48;
// Between the last bubble and the AI input's top.
const OVER_INPUT = 32;

interface ChatHeaderProps {
  onReset: () => void;
  onClose: () => void;
}

// The round chat icon, "SNU Now AI", 새 대화 and the close button, under the phone's status bar.
function ChatHeader({ onReset, onClose }: ChatHeaderProps): ReactElement {
  const { top } = useSafeAreaInsets();
  return (
    <View style={[styles.header, { height: HEADER + top, paddingTop: top }]}>
      <View style={styles.icon}>
        <Icon color={color.onPrimary} name="chat" size={18} />
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        SNU Now AI
      </Text>
      <Button icon="plus" onPress={onReset} variant="ghost">
        새 대화
      </Button>
      <Pressable accessibilityLabel="대화 닫기" accessibilityRole="button" onPress={onClose} style={styles.close}>
        <Icon color={color.ink} name="x" size={22} />
      </Pressable>
    </View>
  );
}

// What the event cards of the answers do. Their 파티 찾기/모집 and AI 매칭 open the 행사 tab's own sheets over the chat,
// which stays open under them, and what those sheets open next lies over the main screen as it does over the tab.
function useEventCards(onOpenEvent: (globalEventId: string) => void): {
  actions: EventCardActions;
  sheets: ReactElement;
} {
  const sheets = useEventSheets();
  const quests = useQuery(questsQuery).data ?? [];
  const { setRecruitEvent, setMatchEvent } = sheets;
  const actions = useMemo(
    () => ({ open: onOpenEvent, recruit: setRecruitEvent, match: setMatchEvent }),
    [onOpenEvent, setMatchEvent, setRecruitEvent],
  );
  return { actions, sheets: <EventSheets quests={quests} sheets={sheets} /> };
}

// What the Quest cards of the answers do. Their join button opens 찾기's join confirmation over the chat, which stays
// open under it, and joining an Open Quest shows 내 파티 over the main screen, as it does from 찾기.
function useQuestCards(onOpenPost: (questId: string) => void): {
  actions: QuestCardActions;
  sheet: ReactElement;
} {
  const [joining, setJoining] = useState<PostView | null>(null);
  const partyActions = usePartyActions();
  const actions = useMemo(() => ({ open: onOpenPost, join: setJoining }), [onOpenPost]);
  const sheet = (
    <JoinSheet
      onClose={() => {
        setJoining(null);
      }}
      onJoin={(chosen) => void partyActions.join(chosen)}
      post={joining}
    />
  );
  return { actions, sheet };
}

// The chat with the Assistant, the `MainChat` frame: a translucent sheet from the top of the screen to the
// navigation, over the map and the lists. The AI input stays at the bottom over it as the chat's input. The
// conversation is the main screen's, so that the sheet only shows it.
export function ChatSheet(props: ChatSheetProps): ReactElement {
  const { chat, inFront, onClose, onShowLayer, onOpenEvent, onOpenPost, inputHeight } = props;
  const { top } = useSafeAreaInsets();
  useBackToClose(inFront, onClose);
  const eventCards = useEventCards(onOpenEvent);
  const questCards = useQuestCards(onOpenPost);
  const cardActions: CardActions = useMemo(
    () => ({ events: eventCards.actions, quests: questCards.actions }),
    [eventCards.actions, questCards.actions],
  );
  const { bubbles, waiting, send, retry, reset } = chat;
  // From the sheet's bottom to the AI input's top, and the room above it.
  const under = AI_INPUT.bottom + inputHeight + 2 * space[1] + OVER_INPUT;
  return (
    <View style={[styles.sheet, { top: -top }]} testID="chat-sheet">
      <ChatHeader onClose={onClose} onReset={reset} />
      {bubbles.length === 0 && !waiting ? (
        <ChatEmpty onSend={send} under={under} />
      ) : (
        <ChatBubbles
          bubbles={bubbles}
          cardActions={cardActions}
          onRetry={retry}
          onShowLayer={onShowLayer}
          under={under}
          waiting={waiting}
        />
      )}
      {eventCards.sheets}
      {questCards.sheet}
    </View>
  );
}

export interface ChatSheetControl {
  chat: Chat;
  shown: boolean;
  open: () => void;
  // The sheet while it is open, for an AI input of that height.
  sheet: (inputHeight: number) => ReactElement | null;
}

// The chat's sheet and how to open it. The conversation is kept while the sheet is closed. A map button closes the
// sheet and turns its layer on with `turnOn`, the map's own layers; an event card closes it and opens the 행사 tab at
// the event, as the room's event does; a Quest card closes it and opens the post, as 찾기's card does.
export function useChatSheet(inFront: boolean, turnOn: (layer: MapLayer) => void): ChatSheetControl {
  const chat = useChat();
  const [shown, setShown] = useState(false);
  const open = useCallback((): void => {
    setShown(true);
  }, []);
  const close = useCallback((): void => {
    setShown(false);
  }, []);
  const showLayer = useCallback(
    (layer: MapLayer): void => {
      setShown(false);
      turnOn(layer);
    },
    [turnOn],
  );
  const openEvent = useCallback((globalEventId: string): void => {
    setShown(false);
    router.navigate({ pathname: '/events', params: { focus: globalEventId } });
  }, []);
  const openQuestPost = useCallback((questId: string): void => {
    setShown(false);
    openPost(questId);
  }, []);
  return {
    chat,
    shown,
    open,
    sheet: (inputHeight) =>
      shown ? (
        <ChatSheet
          chat={chat}
          inFront={inFront}
          inputHeight={inputHeight}
          onClose={close}
          onOpenEvent={openEvent}
          onOpenPost={openQuestPost}
          onShowLayer={showLayer}
        />
      ) : null,
  };
}

const styles = StyleSheet.create({
  // What floats over the map starts under the status bar, so the sheet's `top` goes up by its height.
  sheet: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
    backgroundColor: color.surfaceGlass,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingRight: space[2], paddingLeft: space[5] },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: CHAT_ICON,
    height: CHAT_ICON,
    borderRadius: CHAT_ICON / 2,
    backgroundColor: color.snuBlue,
  },
  title: { flex: 1, fontFamily: font.semiBold, fontSize: 16, lineHeight: 22, color: color.ink },
  close: { alignItems: 'center', justifyContent: 'center', width: CLOSE, height: CLOSE },
});
