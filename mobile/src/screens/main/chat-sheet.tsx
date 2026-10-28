/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-19  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { type ReactElement, useCallback, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MapLayer, QuestProposal } from '@/api/assistant-types';
import { globalEventAnnouncersQuery, questsQuery } from '@/api/queries';
import { now } from '@/clock';
import { Button, color, font, Icon, space, useToast } from '@/design-system';
import { type Chat, useChat } from '@/features/assistant/use-chat';
import type { Suggestion } from '@/features/assistant/use-suggestion';
import { useBackToClose } from '@/hooks/use-back-to-close';
import { holdProposal } from '@/features/party/held-proposal';
import { isReady, type PartyForm, proposalForm } from '@/features/party/making';
import type { PostView } from '@/features/party/posts';
import { EventSheets, useEventSheets } from '../events/event-sheets';
import { JoinSheet } from '../party/join-sheet';
import { useSendParty } from '../party/form/use-send';
import { openPost } from '../party/post-card';
import { showMine, usePartyActions } from '../party/use-party-actions';
import { type CardActions, ChatBubbles, ChatEmpty, type ProposalActions } from './chat-bubbles';
import type { EventCardActions } from './chat-event-cards';
import type { ProposalMaking } from './chat-proposal-card';
import type { QuestCardActions } from './chat-quest-cards';
import { type ChatFrom, SuggestionRow, useSuggestedSheet } from './chat-suggestion';

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
  // The Proposal card of an answer: 만들기, and how it stands.
  proposals: ProposalActions;
  // The grey suggestion of the empty chat.
  suggestion: Suggestion;
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
// conversation is the main screen's, so that the sheet only shows it. A press on the sheet that nothing in it takes
// puts the keyboard down, and the sheet stays: the header and the conversation each see to it. The sheet itself takes
// no touch: on Android a JS responder around the conversation's scroll view takes the drag from it, and the
// conversation stopped scrolling while the keyboard was down.
export function ChatSheet(props: ChatSheetProps): ReactElement {
  const { chat, inFront, onClose, onShowLayer, onOpenEvent, onOpenPost, proposals, suggestion, inputTop } = props;
  const { top } = useSafeAreaInsets();
  useBackToClose(inFront, onClose);
  const eventCards = useEventCards(onOpenEvent);
  const questCards = useQuestCards(onOpenPost);
  const cardActions: CardActions = useMemo(
    () => ({ events: eventCards.actions, quests: questCards.actions, proposals }),
    [eventCards.actions, questCards.actions, proposals],
  );
  const { bubbles, waiting, send, choose, retry, reset } = chat;
  // From the sheet's bottom to the AI input's top, and the room above it.
  const under = inputTop + OVER_INPUT;
  return (
    <View style={[styles.sheet, { top: -top }]} testID="chat-sheet">
      <ChatHeader onClose={onClose} onReset={reset} />
      {bubbles.length === 0 && !waiting ? (
        <ChatEmpty onSend={send} suggestion={<SuggestionRow suggestion={suggestion} />} under={under} />
      ) : (
        <ChatBubbles
          bubbles={bubbles}
          cardActions={cardActions}
          onChoose={choose}
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

const NOT_READY = '빠진 내용이 있어요. 채팅으로 알려 주세요';
const STARTED = '시작 시간이 지났어요. 새 시간을 채팅으로 알려 주세요';

// Why a Proposal cannot be sent as it stands, checked again on the phone before 만들기: the form's own readiness, and a
// start that has passed since the Assistant proposed it, which the main server would take.
function blockOf(proposal: QuestProposal, form: PartyForm): string | null {
  if (!isReady(form, proposal.invitees.length, false)) {
    return NOT_READY;
  }
  return form.startsAt !== null && new Date(form.startsAt) <= now() ? STARTED : null;
}

// 수정 on a Proposal card: closes the sheet and opens the party form filled with the Proposal, which tells `made` once
// it made the Quest.
function openProposalForm(proposal: QuestProposal, made: () => void, close: () => void): void {
  holdProposal({ proposal, made });
  close();
  router.push({ pathname: '/party-form', params: { fromProposal: '1' } });
}

// 만들기 on a Proposal card: makes the Quest the way the party form does, attending its event and inviting its Friends,
// and shows the form's toast. Made, it closes the sheet and goes where the form goes after making, 내 파티, or to the
// room when a step after attending the event failed; refused, the sheet stays and the card can be pressed again. A
// Proposal is made once: its card then says so, and a second press while it is on its way does nothing. The state
// lives with the conversation, so that closing the sheet keeps it.
// A Quest made in the form 수정 opens counts as made here too, so that the card does not make it again; coming back
// without making leaves the card as it was. `onMade` closes the sheet once 만들기 made a Quest, told which and from
// which card's bubble.
function useProposalMaking(close: () => void, onMade: (bubbleId: number, questId: string) => void): ProposalActions {
  const sendParty = useSendParty(null);
  const showToast = useToast();
  const announcers = useQuery(globalEventAnnouncersQuery).data;
  const [making, setMaking] = useState<ReadonlyMap<number, ProposalMaking>>(new Map());
  // The bubbles whose 만들기 is on its way, before a render disables their button.
  const sending = useRef(new Set<number>());
  const mark = useCallback((bubbleId: number, state: ProposalMaking): void => {
    setMaking((held) => new Map(held).set(bubbleId, state));
  }, []);
  const make = (bubbleId: number, proposal: QuestProposal): void => {
    if (sending.current.has(bubbleId)) {
      return;
    }
    const form = proposalForm(proposal, announcers);
    const blocked = blockOf(proposal, form);
    if (blocked !== null) {
      showToast(blocked);
      return;
    }
    sending.current.add(bubbleId);
    mark(bubbleId, 'making');
    const invitees = proposal.invitees.map(({ id }) => id);
    void sendParty(form, invitees, null).then((sent) => {
      showToast(sent.toast);
      if (sent.sent === 'refused') {
        sending.current.delete(bubbleId);
        mark(bubbleId, 'ready');
        return;
      }
      mark(bubbleId, 'made');
      onMade(bubbleId, sent.questId);
      if (sent.sent === 'room') {
        router.navigate(`/room/${sent.questId}`);
      } else {
        showMine();
      }
    });
  };
  const edit = (bubbleId: number, proposal: QuestProposal): void => {
    openProposalForm(
      proposal,
      () => {
        mark(bubbleId, 'made');
      },
      close,
    );
  };
  return { makingOf: (bubbleId) => making.get(bubbleId) ?? 'ready', make, edit };
}

// What closes the sheet and goes elsewhere: a map button to its layer, an event card to the 행사 tab, a Quest card to
// its post.
function useLeaving(
  close: () => void,
  turnOn: (layer: MapLayer) => void,
): {
  showLayer: (layer: MapLayer) => void;
  openEvent: (globalEventId: string) => void;
  openQuestPost: (questId: string) => void;
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
  return { showLayer, openEvent, openQuestPost };
}

export interface ChatSheetControl {
  chat: Chat;
  shown: boolean;
  open: () => void;
  // The AI input's placeholder: the suggestion's text while one is held.
  placeholder: string | undefined;
  // The sheet while it is open, under an AI input whose top stands that high above the sheet's bottom.
  sheet: (inputTop: number) => ReactElement | null;
}

// The chat's sheet and how to open it. The conversation is kept while the sheet is closed. A map button closes the
// sheet and turns its layer on with `turnOn`, the map's own layers; an event card closes it and opens the 행사 tab at
// the event, as the room's event does; a Quest card closes it and opens the post, as 찾기's card does; a Proposal,
// once made, closes it and shows 내 파티, as the party form does, and its 수정 closes it and opens that form. Opening
// on the empty chat asks for a grey suggestion (`useSuggestedSheet`).
export function useChatSheet(inFront: boolean, turnOn: (layer: MapLayer) => void, from: ChatFrom): ChatSheetControl {
  const chat = useChat();
  const [shown, setShown] = useState(false);
  const { suggestion, open, close, closeMade } = useSuggestedSheet(chat, from, setShown);
  const { showLayer, openEvent, openQuestPost } = useLeaving(close, turnOn);
  const proposals = useProposalMaking(close, closeMade);
  return {
    chat,
    shown,
    open,
    placeholder: suggestion.held?.text,
    sheet: (inputTop) =>
      shown ? (
        <ChatSheet
          chat={chat}
          inFront={inFront}
          inputTop={inputTop}
          onClose={close}
          onOpenEvent={openEvent}
          onOpenPost={openQuestPost}
          onShowLayer={showLayer}
          proposals={proposals}
          suggestion={suggestion}
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
