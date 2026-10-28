/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-19  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, type ReactNode, useRef } from 'react';
import { Keyboard, Pressable, ScrollView, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import type { Choice, GlobalEventCard, MapLayer, QuestProposal } from '@/api/assistant-types';
import type { ShownChatCard, ShownRecruitingQuest } from '@/api/quest-parts-types';
import { Button, color, font, Icon, type IconName, radius, space, text } from '@/design-system';
import type { ChatBubble } from '@/features/assistant/use-chat';
import { ChatChoices } from './chat-choices';
import { ChatEventCards, type EventCardActions } from './chat-event-cards';
import { ChatProposalCard, type ProposalMaking } from './chat-proposal-card';
import { ChatQuestCards, type QuestCardActions } from './chat-quest-cards';

// The examples of the empty chat, each with its icon on its layer's colour. They replace the frame's library seats,
// and 파티 찾기 takes the Party's colour. A press sends the words.
const CHAT_EXAMPLES: readonly { words: string; icon: IconName; tint: string }[] = [
  { words: '식사 메뉴 추천', icon: 'meal', tint: color.svcDining },
  { words: '현재 통학/순환 셔틀 위치', icon: 'bus', tint: color.svcShuttle },
  { words: '파티 찾기', icon: 'users', tint: color.party },
];

// What a chat's scroll view holds, filling it: a press on it that nothing in it takes puts the keyboard down. It lies
// inside the scroll view, not around it: on Android a JS responder around a scroll view takes the drag from it.
function Dismissing({ style, children }: { style: StyleProp<ViewStyle>; children: ReactNode }): ReactElement {
  return (
    <Pressable
      accessible={false}
      onPress={() => {
        Keyboard.dismiss();
      }}
      style={style}
    >
      {children}
    </Pressable>
  );
}

interface ChatEmptyProps {
  onSend: (text: string) => void;
  // How far from the sheet's bottom the content ends, clear of the AI input.
  under: number;
}

// The empty chat: the greeting, where what the User writes goes, and the examples as rows. A drag puts the keyboard
// down, and so does a press that no example takes; a press on an example sends it at once, keyboard up or not.
export function ChatEmpty({ onSend, under }: ChatEmptyProps): ReactElement {
  return (
    <ScrollView
      contentContainerStyle={[styles.fill, { paddingBottom: under }]}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      testID="chat-empty"
    >
      <Dismissing style={styles.empty}>
        <Text accessibilityRole="header" style={styles.greeting}>
          무엇을 도와드릴까요?
        </Text>
        <Text style={styles.notice}>대화 내용은 AI 제공자에게 전송돼요</Text>
        <View style={styles.examples}>
          {CHAT_EXAMPLES.map(({ words, icon, tint }) => (
            <Pressable
              accessibilityLabel={words}
              accessibilityRole="button"
              key={words}
              onPress={() => {
                onSend(words);
              }}
              style={({ pressed }) => [styles.example, pressed && styles.examplePressed]}
            >
              <View style={[styles.exampleIcon, { backgroundColor: tint }]}>
                <Icon color={color.onPrimary} name={icon} size={18} />
              </View>
              <Text style={styles.exampleText}>{words}</Text>
              <Icon color={color.inkMuted} name="chevronRight" size={18} />
            </Pressable>
          ))}
        </View>
      </Dismissing>
    </ScrollView>
  );
}

// The map button of each layer, with the layer's own icon.
const MAP_BUTTONS: Record<MapLayer, { label: string; icon: IconName }> = {
  dining: { label: '지도에서 식당 보기', icon: 'meal' },
  shuttle: { label: '지도에서 셔틀 보기', icon: 'bus' },
};

// What the Proposal card of an answer does, by the answer's bubble: how its making stands, 만들기 and 수정.
export interface ProposalActions {
  makingOf: (bubbleId: number) => ProposalMaking;
  make: (bubbleId: number, proposal: QuestProposal) => void;
  edit: (bubbleId: number, proposal: QuestProposal) => void;
}

// What the cards of the answers do.
export interface CardActions {
  events: EventCardActions;
  quests: QuestCardActions;
  proposals: ProposalActions;
}

// The cards of an answer in the order the Assistant showed them, the cards of one kind next to each other together.
type CardRun = { kind: 'globalEvent'; events: GlobalEventCard[] } | { kind: 'quest'; quests: ShownRecruitingQuest[] };

function runsOf(cards: readonly ShownChatCard[]): CardRun[] {
  const runs: CardRun[] = [];
  for (const card of cards) {
    const last = runs.at(-1);
    if (card.kind === 'globalEvent') {
      if (last?.kind === 'globalEvent') {
        last.events.push(card);
      } else {
        runs.push({ kind: 'globalEvent', events: [card] });
      }
    } else if (last?.kind === 'quest') {
      last.quests.push(card.quest);
    } else {
      runs.push({ kind: 'quest', quests: [card.quest] });
    }
  }
  return runs;
}

function Cards({ cards, actions }: { cards: readonly ShownChatCard[]; actions: CardActions }): ReactElement {
  return (
    <>
      {runsOf(cards).map((run) =>
        run.kind === 'globalEvent' ? (
          <ChatEventCards actions={actions.events} cards={run.events} key={`event-${run.events[0]?.globalEvent.id}`} />
        ) : (
          <ChatQuestCards actions={actions.quests} key={`quest-${run.quests[0]?.id}`} quests={run.quests} />
        ),
      )}
    </>
  );
}

// The Proposal card of the answer in this bubble.
function Proposal({
  bubbleId,
  proposal,
  actions,
}: {
  bubbleId: number;
  proposal: QuestProposal;
  actions: ProposalActions;
}): ReactElement {
  return (
    <ChatProposalCard
      making={actions.makingOf(bubbleId)}
      onEdit={() => {
        actions.edit(bubbleId, proposal);
      }}
      onMake={() => {
        actions.make(bubbleId, proposal);
      }}
      proposal={proposal}
    />
  );
}

interface BubbleProps {
  bubble: ChatBubble;
  // 다시 시도 under a failure the Assistant may get over, while it is the last bubble.
  onRetry: (() => void) | null;
  // The chips of the answer's candidates, while it is the last bubble.
  onChoose: ((choice: Choice) => void) | null;
  onShowLayer: (layer: MapLayer) => void;
  cardActions: CardActions;
}

function Bubble({
  bubble: { id, role, text: words, cards, mapButtons, proposal, choices, failure },
  onRetry,
  onChoose,
  onShowLayer,
  cardActions,
}: BubbleProps): ReactElement {
  const mine = role === 'user';
  // Only under an answer: a failure has none.
  const layers = failure === null ? mapButtons : [];
  const shown = failure === null ? cards : [];
  const proposed = failure === null ? proposal : null;
  return (
    <View
      style={[styles.bubble, mine ? styles.mine : styles.theirs]}
      testID={mine ? 'user-bubble' : 'assistant-bubble'}
    >
      <Text style={[styles.words, mine && styles.mineWords]}>{words}</Text>
      {shown.length === 0 ? null : <Cards actions={cardActions} cards={shown} />}
      {proposed === null ? null : <Proposal actions={cardActions.proposals} bubbleId={id} proposal={proposed} />}
      {onChoose === null || choices.length === 0 ? null : <ChatChoices choices={choices} onChoose={onChoose} />}
      {layers.map((layer) => (
        <View key={layer} style={styles.below}>
          <Button
            icon={MAP_BUTTONS[layer].icon}
            onPress={() => {
              onShowLayer(layer);
            }}
            variant="secondary"
          >
            {MAP_BUTTONS[layer].label}
          </Button>
        </View>
      ))}
      {onRetry === null ? null : (
        <View style={styles.below}>
          <Button onPress={onRetry} variant="secondary">
            다시 시도
          </Button>
        </View>
      )}
    </View>
  );
}

interface ChatBubblesProps {
  bubbles: readonly ChatBubble[];
  waiting: boolean;
  onRetry: () => void;
  // A chip of the last answer: sends its candidate as the User's choice.
  onChoose: (choice: Choice) => void;
  // A map button: shows that layer on the map.
  onShowLayer: (layer: MapLayer) => void;
  // What the cards of the answers do.
  cardActions: CardActions;
  // How far from the sheet's bottom the last bubble ends, clear of the AI input.
  under: number;
}

// The conversation: the User's bubbles at the right, the Assistant's at the left, and "···" while the Assistant
// works. It keeps the latest in view. A drag puts the keyboard down, and so does a press that no button takes; a press
// on a button sends it at once, keyboard up or not.
export function ChatBubbles(props: ChatBubblesProps): ReactElement {
  const { bubbles, waiting, onRetry, onChoose, onShowLayer, cardActions, under } = props;
  const scroller = useRef<ScrollView>(null);
  return (
    <ScrollView
      contentContainerStyle={[styles.fill, { paddingBottom: under }]}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      onContentSizeChange={() => {
        scroller.current?.scrollToEnd({ animated: true });
      }}
      ref={scroller}
      testID="chat-bubbles"
    >
      <Dismissing style={styles.bubbles}>
        {bubbles.map((bubble, index) => (
          <Bubble
            bubble={bubble}
            cardActions={cardActions}
            key={bubble.id}
            onChoose={index === bubbles.length - 1 ? onChoose : null}
            onRetry={bubble.failure === 'unavailable' && index === bubbles.length - 1 && !waiting ? onRetry : null}
            onShowLayer={onShowLayer}
          />
        ))}
        {waiting ? (
          <View accessibilityLabel="답변을 기다리는 중" style={[styles.bubble, styles.theirs]} testID="waiting-bubble">
            <Text style={styles.waiting}>···</Text>
          </View>
        ) : null}
      </Dismissing>
    </ScrollView>
  );
}

// The frame's corners: 16, and 6 at the corner toward the speaker.
const TAIL = 6;
const EXAMPLE_ICON = 36;

const styles = StyleSheet.create({
  // A chat's scroll view: what it holds fills it, so that a press below the last of it puts the keyboard down too.
  fill: { flexGrow: 1 },
  empty: { flexGrow: 1, gap: space[3], paddingTop: space[4], paddingHorizontal: space[4] },
  greeting: { ...text.titleLg, color: color.ink },
  notice: { ...text.caption, marginTop: -space[2], color: color.inkMuted },
  examples: { gap: space[2] },
  example: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 56,
    paddingVertical: space[2],
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  examplePressed: { backgroundColor: color.blue50 },
  exampleIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: EXAMPLE_ICON,
    height: EXAMPLE_ICON,
    borderRadius: radius.md,
  },
  exampleText: { flex: 1, fontFamily: font.semiBold, fontSize: 15, lineHeight: 22, color: color.ink },
  bubbles: { flexGrow: 1, gap: space[3], paddingTop: space[2], paddingHorizontal: space[4] },
  bubble: { paddingVertical: space[3], borderRadius: radius.lg },
  mine: {
    alignSelf: 'flex-end',
    maxWidth: '84%',
    paddingHorizontal: space[4],
    borderBottomRightRadius: TAIL,
    backgroundColor: color.snuBlue,
  },
  theirs: {
    alignSelf: 'flex-start',
    maxWidth: '92%',
    paddingHorizontal: 14,
    borderBottomLeftRadius: TAIL,
    backgroundColor: color.blue50,
  },
  words: { ...text.bodyLg, color: color.ink },
  mineWords: { color: color.onPrimary },
  // 다시 시도 and the map buttons.
  below: { marginTop: space[2] },
  waiting: { ...text.bodyLg, fontFamily: font.bold, letterSpacing: 3.2, color: color.inkMuted },
});
