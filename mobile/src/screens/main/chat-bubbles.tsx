/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-19  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { MapLayer, QuestProposal } from '@/api/assistant-types';
import { Button, type IconName, space } from '@/design-system';
import type { ChatBubble } from '@/features/assistant/use-chat';
import { type CardActions, Cards, type ProposalActions } from './chat-cards';
import { ChatProposalCard } from './chat-proposal-card';
import type { LibraryDone } from '@/library/cards/done';
import { LibraryDoneRows } from './library/library-done';

// The map button of each layer, with the layer's own icon.
const MAP_BUTTONS: Record<MapLayer, { label: string; icon: IconName }> = {
  dining: { label: '지도에서 식당 보기', icon: 'meal' },
  shuttle: { label: '지도에서 셔틀 보기', icon: 'bus' },
};

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
      moved={actions.movedOf(bubbleId, proposal)}
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

// The done message of a library booking, whose 좌석 현황 보기 gives the seats card in the app's own bubble.
function Done({ done, actions }: { done: LibraryDone; actions: CardActions }): ReactElement {
  return (
    <LibraryDoneRows
      done={done}
      walk={actions.library.bookingWalk?.() ?? null}
      onSeats={() => {
        actions.library.addOwn({ text: '좌석 현황이에요.', cards: [{ kind: 'library', library: done.seatsCard }] });
      }}
    />
  );
}

interface BubblePartsProps {
  bubble: ChatBubble;
  // What the bubble says, before its cards.
  words: ReactNode;
  // 다시 시도 under a failure the Assistant may get over, while it is the last bubble.
  onRetry: (() => void) | null;
  onShowLayer: (layer: MapLayer) => void;
  cardActions: CardActions;
}

// What a bubble holds: its words, then its cards, a booking's done message, its Proposal, its map buttons and 다시 시도.
// The answer frame draws them without a bubble around them.
export function BubbleParts({
  bubble: { id, cards, mapButtons, proposal, failure, own = false, done },
  words,
  onRetry,
  onShowLayer,
  cardActions,
}: BubblePartsProps): ReactElement {
  // Only under an answer: a failure has none.
  const layers = failure === null ? mapButtons : [];
  const shown = failure === null ? cards : [];
  const proposed = failure === null ? proposal : null;
  return (
    <>
      {words}
      {shown.length === 0 ? null : <Cards actions={cardActions} bubbleId={id} cards={shown} own={own} />}
      {done === undefined ? null : <Done actions={cardActions} done={done} />}
      {proposed === null ? null : <Proposal actions={cardActions.proposals} bubbleId={id} proposal={proposed} />}
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
    </>
  );
}

const styles = StyleSheet.create({
  // 다시 시도 and the map buttons.
  below: { marginTop: space[2] },
});
