/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { type ReactElement, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { myPartyQuery } from '@/api/queries';
import { ChipRow, EmptyState, ErrorState, LoadingState, SectionHeader, space } from '@/design-system';
import { filterMine, groupMine, type MineCardView, type MineFilter } from '@/features/party/mine';
import { useMineCards } from '@/features/party/use-party';
import { joinAsk } from '../room/activation-box';
import { type Ask, ConfirmSheet } from '../room/confirm-sheet';
import { useRoomActions } from '../room/use-room-actions';
import { MineCard } from './mine-card';

const EMPTY: Record<MineFilter, string> = {
  all: '참여 중인 파티가 없어요',
  private: '비공개 파티가 없어요',
  public: '참여 중인 공개 파티가 없어요',
};

// The strip's `참여` enters as the room's does: at once, or after asking when the User must leave another Party.
function useEnter(onAsk: (ask: Ask) => void): (card: MineCardView) => void {
  const myParty = useQuery(myPartyQuery).data ?? null;
  const actions = useRoomActions();
  return ({ strip }) => {
    if (strip === null) {
      return;
    }
    if (myParty === null) {
      void actions.joinParty(strip.partyId, false);
    } else {
      onAsk(joinAsk(strip.title, myParty.title, () => void actions.joinParty(strip.partyId, true)));
    }
  };
}

interface MineList {
  chips: ReactElement;
  cards: ReactElement;
  sheet: ReactElement;
}

// 내 파티's parts, for the frame that scrolls them: the chips that stay on top, the cards that scroll, and the sheet
// that asks before entering. The 파티 tab shows them, and so does 참여 중인 파티 above the tabs.
export function useMineList(): MineList {
  const { data: cards, isPending, refetch } = useMineCards();
  const [filter, setFilter] = useState<MineFilter>('all');
  const [ask, setAsk] = useState<Ask | null>(null);
  const enter = useEnter(setAsk);
  const { declineParty } = useRoomActions();
  const all = cards ?? [];
  const shown = filterMine(all, filter);
  // The chips count, and the empty state minds, the Quests the User holds now, not the past ones.
  const held = (chosen: MineFilter): number => filterMine(all, chosen).filter(({ past }) => !past).length;
  return {
    chips: (
      <ChipRow
        chips={[
          { key: 'all', label: '전체', count: held('all') },
          { key: 'private', label: '비공개', count: held('private') },
          { key: 'public', label: '공개', count: held('public') },
        ]}
        onSelect={setFilter}
        selected={filter}
      />
    ),
    cards: (
      <View style={styles.body}>
        {cards === undefined && isPending ? <LoadingState /> : null}
        {cards === undefined && !isPending ? <ErrorState onRetry={refetch} /> : null}
        {cards !== undefined && held(filter) === 0 ? <EmptyState icon="users" words={EMPTY[filter]} /> : null}
        {groupMine(shown).map((group) => (
          <View key={group.title} style={styles.group}>
            <SectionHeader>{group.title}</SectionHeader>
            {group.cards.map((card) => (
              <MineCard card={card} key={card.questId} onDecline={declineParty} onEnter={enter} />
            ))}
          </View>
        ))}
      </View>
    ),
    sheet: (
      <ConfirmSheet
        ask={ask}
        label="확인"
        onClose={() => {
          setAsk(null);
        }}
      />
    ),
  };
}

// 내 파티, the frame's `PartyMine`.
export function MineTab(): ReactElement {
  const { chips, cards, sheet } = useMineList();
  return (
    <>
      {chips}
      <ScrollView>{cards}</ScrollView>
      {sheet}
    </>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[5], paddingHorizontal: space[4], paddingBottom: space[6] },
  group: { gap: space[3] },
});
