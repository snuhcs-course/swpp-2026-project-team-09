/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-19  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { router } from 'expo-router';
import { type ReactElement, useCallback, useEffect, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MapLayer, QuestProposal, RequestContext } from '@/api/assistant-types';
import type { LatLng } from '@/api/types';
import { Button, color, font, Icon, space } from '@/design-system';
import { onAnswerSwitchChange, useAnswerSwitch } from '@/features/assistant/answer-switch';
import { type Chat, useChat } from '@/features/assistant/use-chat';
import { useBackToClose } from '@/hooks/use-back-to-close';
import { openPost } from '../party/post-card';
import { ChatBubbles, ChatEmpty } from './chat-bubbles';
import { type CardLeaving, useCardActions } from './chat-card-actions';
import type { ProposalActions } from './chat-cards';
import { openProposalForm, useProposalMaking } from './use-proposal-making';

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
  // A Restaurant card's 파티 만들기: closes the sheet and opens the party form filled with its Proposal.
  onOpenPartyForm: (proposal: QuestProposal) => void;
  // The Proposal card of an answer: 만들기, and how it stands.
  proposals: ProposalActions;
  // How high the AI input's top stands above the sheet's bottom: the input lies over it.
  inputTop: number;
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

// The round chat icon, "SNU Now AI", 새 대화 and the close button, under the phone's status bar. A press on it that
// neither button takes puts the keyboard down.
function ChatHeader({ onReset, onClose }: ChatHeaderProps): ReactElement {
  const { top } = useSafeAreaInsets();
  return (
    <Pressable
      accessible={false}
      onPress={() => {
        Keyboard.dismiss();
      }}
      style={[styles.header, { height: HEADER + top, paddingTop: top }]}
      testID="chat-header"
    >
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
    </Pressable>
  );
}

// The chat with the Assistant, the `MainChat` frame: a translucent sheet from the top of the screen to the
// navigation, over the map and the lists. The AI input stays at the bottom over it as the chat's input. The
// conversation is the main screen's, so that the sheet only shows it. A press on the sheet that nothing in it takes
// puts the keyboard down, and the sheet stays: the header and the conversation each see to it. The sheet itself takes
// no touch: on Android a JS responder around the conversation's scroll view takes the drag from it, and the
// conversation stopped scrolling while the keyboard was down.
export function ChatSheet(props: ChatSheetProps): ReactElement {
  const { chat, inFront, onClose, onShowLayer, onOpenEvent, onOpenPost, onOpenPartyForm, proposals, inputTop } = props;
  const { top } = useSafeAreaInsets();
  useBackToClose(inFront, onClose);
  const { actions: cardActions, sheets } = useCardActions(chat, {
    openEvent: onOpenEvent,
    openQuestPost: onOpenPost,
    openPartyForm: onOpenPartyForm,
    proposals,
  });
  const { bubbles, waiting, send, retry, reset } = chat;
  // From the sheet's bottom to the AI input's top, and the room above it.
  const under = inputTop + OVER_INPUT;
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
      {sheets}
    </View>
  );
}

function ignoreMade(): void {
  // A Restaurant card says nothing of what its form made.
}

// What closes the sheet and goes elsewhere: a map button to its layer, an event card to the 행사 tab, a Quest card to
// its post, a Restaurant card to the party form.
function useLeaving(
  close: () => void,
  turnOn: (layer: MapLayer) => void,
): {
  showLayer: (layer: MapLayer) => void;
  openEvent: (globalEventId: string) => void;
  openQuestPost: (questId: string) => void;
  openPartyForm: (proposal: QuestProposal) => void;
} {
  const showLayer = useCallback(
    (layer: MapLayer): void => {
      close();
      turnOn(layer);
    },
    [close, turnOn],
  );
  const openEvent = useCallback(
    (globalEventId: string): void => {
      close();
      router.navigate({ pathname: '/events', params: { focus: globalEventId } });
    },
    [close],
  );
  const openQuestPost = useCallback(
    (questId: string): void => {
      close();
      openPost(questId);
    },
    [close],
  );
  const openPartyForm = useCallback(
    (proposal: QuestProposal): void => {
      openProposalForm(proposal, ignoreMade, close);
    },
    [close],
  );
  return { showLayer, openEvent, openQuestPost, openPartyForm };
}

export interface ChatSheetControl {
  chat: Chat;
  shown: boolean;
  open: () => void;
  // The sheet while it is open, under an AI input whose top stands that high above the sheet's bottom.
  sheet: (inputTop: number) => ReactElement | null;
  // The switch of the answer on the map is on: the sheet never opens, and the answer frame shows the conversation.
  onMap: boolean;
  // The answer frame is shown: the switch is on and the conversation holds something.
  framed: boolean;
  // Where the answer frame's cards lead, and its map buttons.
  leaving: CardLeaving & { showLayer: (layer: MapLayer) => void };
}

// A change of the switch of the answer on the map closes the sheet and forgets the conversation.
function useForgottenOnSwitchChange(closeSheet: () => void, reset: () => void): void {
  useEffect(
    () =>
      onAnswerSwitchChange(() => {
        closeSheet();
        reset();
      }),
    [closeSheet, reset],
  );
}

function stay(): void {
  // A card that leads elsewhere leaves the answer frame as it is.
}

// What the app knows when the User asks: where the User is on campus, and nothing of an answer on screen yet.
function contextAt(position: LatLng | null): RequestContext {
  return { location: position, viewport: null, tapped: null, conditions: null, planId: null };
}

// The chat's sheet and how to open it. The conversation is kept while the sheet is closed. A map button closes the
// sheet and turns its layer on with `turnOn`, the map's own layers; an event card closes it and opens the 행사 tab at
// the event, as the room's event does; a Quest card closes it and opens the post, as 찾기's card does; a Proposal,
// once made, closes it and shows 내 파티, as the party form does, and its 수정, like a Restaurant card's 파티 만들기, closes
// it and opens that form. However the sheet closes, the keyboard goes down with it: the AI input would keep the focus
// otherwise.
// With the switch of the answer on the map on, every request carries the context at the User's `position`, the sheet
// never opens, and the answer frame shows the conversation instead: a card that leads elsewhere leaves the frame as
// it is, and a map button forgets the conversation and turns its layer on. A change of the switch closes the sheet and
// forgets the conversation.
export function useChatSheet(
  inFront: boolean,
  turnOn: (layer: MapLayer) => void,
  position: LatLng | null,
): ChatSheetControl {
  const onMap = useAnswerSwitch();
  const chat = useChat(onMap ? (): RequestContext => contextAt(position) : undefined);
  const [shown, setShown] = useState(false);
  const open = useCallback((): void => {
    if (!onMap) {
      setShown(true);
    }
  }, [onMap]);
  const closeSheet = useCallback((): void => {
    Keyboard.dismiss();
    setShown(false);
  }, []);
  useForgottenOnSwitchChange(closeSheet, chat.reset);
  const close = onMap ? stay : closeSheet;
  const { showLayer, openEvent, openQuestPost, openPartyForm } = useLeaving(close, turnOn);
  const proposals = useProposalMaking(close);
  const forgetAndShow = (layer: MapLayer): void => {
    chat.reset();
    turnOn(layer);
  };
  const sheetShown = shown && !onMap;
  return {
    chat,
    shown: sheetShown,
    open,
    onMap,
    framed: onMap && (chat.bubbles.length > 0 || chat.waiting),
    leaving: { showLayer: forgetAndShow, openEvent, openQuestPost, openPartyForm, proposals },
    sheet: (inputTop) =>
      sheetShown ? (
        <ChatSheet
          chat={chat}
          inFront={inFront}
          inputTop={inputTop}
          onClose={closeSheet}
          onOpenEvent={openEvent}
          onOpenPartyForm={openPartyForm}
          onOpenPost={openQuestPost}
          onShowLayer={showLayer}
          proposals={proposals}
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
