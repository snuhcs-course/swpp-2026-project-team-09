/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { friendsQuery, myJoinRequestsQuery } from '@/api/queries';
import type { ShownQuestCard } from '@/api/quest-parts-types';
import { space } from '@/design-system';
import { entryPost, type PostView } from '@/features/party/posts';
import { PostCard } from '../party/post-card';
import { ChatTravelBox } from './chat-travel-box';

// What a Quest card of the chat does: a press opens its post, and its join button the Boards' join confirmation over
// the chat.
export interface QuestCardActions {
  open: (questId: string) => void;
  join: (post: PostView) => void;
}

interface ChatQuestCardsProps {
  cards: readonly ShownQuestCard[];
  actions: QuestCardActions;
}

// The recruiting Quests of an answer, as 찾기's post cards, with what 찾기 adds to them: the User's request to join
// that waits, and their Friends among the members, and with its 이동 시간 box when it has one. The chat has no
// `관심 없음`: hiding a post from 찾기 would leave its card in the answer.
export function ChatQuestCards({ cards, actions }: ChatQuestCardsProps): ReactElement {
  const requests = useQuery(myJoinRequestsQuery).data ?? [];
  const friends = useQuery(friendsQuery).data ?? [];
  return (
    <View style={styles.cards}>
      {cards.map(({ quest, ...box }) => (
        <PostCard
          key={quest.id}
          onJoin={actions.join}
          onOpen={({ questId }) => {
            actions.open(questId);
          }}
          post={entryPost(quest, requests, friends)}
        >
          <ChatTravelBox box={box} />
        </PostCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cards: { gap: space[2], marginTop: space[2] },
});
